const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const auth = require('../middleware/auth');
const db = require('../config/database-postgresql');
const csvExporter = require('../utils/csvExporter');
const lottery = require('../utils/lottery');
const SecurityValidator = require('../security/validation');

const router = express.Router();

// Admin login page
router.get('/login', (req, res) => {
    if (req.session.adminId) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'admin-login.html'));
});

// Admin login POST
router.post('/login', SecurityValidator.adminRateLimit(), async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username e senha são obrigatórios' });
        }

        const sanitizedUsername = SecurityValidator.sanitizeInput(username);
        const admin = await db.get('SELECT * FROM users WHERE username = $1', [sanitizedUsername]);

        if (!admin || !await bcrypt.compare(password, admin.password_hash)) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        req.session.adminId = admin.id;
        res.json({ success: true });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Admin logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Admin dashboard
router.get('/', auth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Get all raffles
router.get('/raffles', auth, async (req, res) => {
    try {
        const raffles = await db.all(`
            SELECT r.*, 
                   COUNT(p.id) as sold_numbers,
                   SUM(CASE WHEN p.status = 'paid' THEN r.price_per_number ELSE 0 END) as total_revenue
            FROM raffles r
            LEFT JOIN participants p ON r.id = p.raffle_id
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `);

        res.json(raffles);
    } catch (error) {
        console.error('Erro ao buscar rifas:', error);
        res.status(500).json({ error: 'Erro ao buscar rifas' });
    }
});

// Create new raffle
router.post('/raffles', auth, async (req, res) => {
    try {
        const { title, description, total_numbers, price_per_number, draw_date } = req.body;

        if (!title || !total_numbers || !price_per_number || !draw_date) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
        }

        if (total_numbers < 1 || total_numbers > 10000) {
            return res.status(400).json({ error: 'Quantidade de números deve ser entre 1 e 10000' });
        }

        if (price_per_number < 0.01) {
            return res.status(400).json({ error: 'Preço por número deve ser maior que R$ 0,01' });
        }

        const result = await db.get(`
            INSERT INTO raffles (title, description, total_numbers, price_per_number, draw_date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [title, description, total_numbers, price_per_number, draw_date]);

        res.json({ id: result.id, message: 'Rifa criada com sucesso' });
    } catch (error) {
        console.error('Erro ao criar rifa:', error);
        res.status(500).json({ error: 'Erro ao criar rifa' });
    }
});

// Update raffle
router.put('/raffles/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, total_numbers, price_per_number, draw_date, status } = req.body;

        await db.run(`
            UPDATE raffles 
            SET title = $1, description = $2, total_numbers = $3, price_per_number = $4, 
                draw_date = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $7
        `, [title, description, total_numbers, price_per_number, draw_date, status, id]);

        res.json({ message: 'Rifa atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar rifa:', error);
        res.status(500).json({ error: 'Erro ao atualizar rifa' });
    }
});

// Delete raffle
router.delete('/raffles/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const participants = await db.get('SELECT COUNT(*) as count FROM participants WHERE raffle_id = $1', [id]);

        if (parseInt(participants.count) > 0) {
            return res.status(400).json({ error: 'Não é possível deletar uma rifa com participantes' });
        }

        await db.run('DELETE FROM raffles WHERE id = $1', [id]);
        res.json({ message: 'Rifa deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar rifa:', error);
        res.status(500).json({ error: 'Erro ao deletar rifa' });
    }
});

// Get raffle participants
router.get('/raffles/:id/participants', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const participants = await db.all(`
            SELECT p.*, pay.status as payment_status, pay.qr_code
            FROM participants p
            LEFT JOIN payments pay ON p.id = pay.participant_id
            WHERE p.raffle_id = $1
            ORDER BY p.number
        `, [id]);

        res.json(participants);
    } catch (error) {
        console.error('Erro ao buscar participantes:', error);
        res.status(500).json({ error: 'Erro ao buscar participantes' });
    }
});

// Export participants to CSV
router.get('/raffles/:id/export', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const raffle = await db.get('SELECT title FROM raffles WHERE id = $1', [id]);
        if (!raffle) {
            return res.status(404).json({ error: 'Rifa não encontrada' });
        }

        const participants = await db.all(`
            SELECT p.number, p.name, p.email, p.phone, p.city, p.status, p.created_at,
                   pay.status as payment_status
            FROM participants p
            LEFT JOIN payments pay ON p.id = pay.participant_id
            WHERE p.raffle_id = $1
            ORDER BY p.number
        `, [id]);

        const csv = await csvExporter.exportParticipants(participants, raffle.title);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="rifa_${id}_participantes.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Erro ao exportar CSV:', error);
        res.status(500).json({ error: 'Erro ao exportar dados' });
    }
});

// Draw winner
router.post('/raffles/:id/draw', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { lottery_number } = req.body;

        if (!lottery_number) {
            return res.status(400).json({ error: 'Número da loteria federal é obrigatório' });
        }

        const raffle = await db.get('SELECT * FROM raffles WHERE id = $1', [id]);
        if (!raffle) {
            return res.status(404).json({ error: 'Rifa não encontrada' });
        }

        const winner_number = lottery.calculateWinnerNumber(lottery_number, raffle.total_numbers);

        await db.run(`
            UPDATE raffles 
            SET winner_number = $1, lottery_number = $2, is_active = false, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $3
        `, [winner_number, lottery_number, id]);

        const winner = await db.get(`
            SELECT p.*, pay.status as payment_status
            FROM participants p
            LEFT JOIN payments pay ON p.id = pay.participant_id
            WHERE p.raffle_id = $1 AND p.number = $2
        `, [id, winner_number]);

        res.json({
            winner_number,
            lottery_number,
            winner: winner || null,
            message: 'Sorteio realizado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao realizar sorteio:', error);
        res.status(500).json({ error: 'Erro ao realizar sorteio' });
    }
});

module.exports = router;