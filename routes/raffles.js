const express = require('express');
const db = require('../config/database-postgresql');
const SecurityValidator = require('../security/validation');

const router = express.Router();

// Get all active raffles
router.get('/', async (req, res) => {
    try {
        const raffles = await db.all(`
            SELECT r.*, 
                   COUNT(p.id) as sold_numbers,
                   SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END) as paid_numbers
            FROM raffles r
            LEFT JOIN participants p ON r.id = p.raffle_id
            WHERE r.is_active = true
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `);
        res.json(raffles);
    } catch (error) {
        console.error('Erro ao buscar rifas:', error);
        res.status(500).json({ error: 'Erro ao buscar rifas' });
    }
});

// Get specific raffle details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const raffle = await db.get('SELECT * FROM raffles WHERE id = $1', [id]);
        if (!raffle) {
            return res.status(404).json({ error: 'Rifa não encontrada' });
        }

        const soldNumbers = await db.all(
            `SELECT number FROM participants 
             WHERE raffle_id = $1 AND status IN ('reserved', 'paid')`,
            [id]
        );

        raffle.sold_numbers = soldNumbers.map(p => p.number);
        res.json(raffle);
    } catch (error) {
        console.error('Erro ao buscar rifa:', error);
        res.status(500).json({ error: 'Erro ao buscar rifa' });
    }
});

// Get raffle participants (public view)
router.get('/:id/participants', async (req, res) => {
    try {
        const { id } = req.params;

        const participants = await db.all(`
            SELECT p.number, p.name, p.status, p.created_at
            FROM participants p
            WHERE p.raffle_id = $1 AND p.status IN ('reserved', 'paid')
            ORDER BY p.number
        `, [id]);

        res.json(participants);
    } catch (error) {
        console.error('Erro ao buscar participantes:', error);
        res.status(500).json({ error: 'Erro ao buscar participantes' });
    }
});

// Check if number is available
router.get('/:id/numbers/:number/available', async (req, res) => {
    try {
        const { id, number } = req.params;

        const participant = await db.get(
            `SELECT id FROM participants WHERE raffle_id = $1 AND number = $2`,
            [id, number]
        );

        res.json({ available: !participant });
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        res.status(500).json({ error: 'Erro ao verificar disponibilidade' });
    }
});

// Reserve a number
router.post('/:id/reserve', SecurityValidator.createRateLimit(60 * 1000, 10), async (req, res) => {
    try {
        const { id } = req.params;
        const { number, name, email, phone, city } = req.body;

        if (!number || !name || !email) {
            return res.status(400).json({ error: 'Número, nome e email são obrigatórios' });
        }

        if (!SecurityValidator.validateEmail(email)) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        if (!SecurityValidator.validateName(name)) {
            return res.status(400).json({ error: 'Nome inválido' });
        }

        if (phone && !SecurityValidator.validatePhone(phone)) {
            return res.status(400).json({ error: 'Telefone inválido' });
        }

        if (city && !SecurityValidator.validateCity(city)) {
            return res.status(400).json({ error: 'Cidade inválida' });
        }

        const sanitizedName = SecurityValidator.sanitizeInput(name);
        const sanitizedEmail = SecurityValidator.sanitizeInput(email);
        const sanitizedPhone = SecurityValidator.sanitizeInput(phone);
        const sanitizedCity = SecurityValidator.sanitizeInput(city);

        const raffle = await db.get(
            'SELECT * FROM raffles WHERE id = $1 AND is_active = true',
            [id]
        );

        if (!raffle) {
            return res.status(404).json({ error: 'Rifa não encontrada ou inativa' });
        }

        if (number < 1 || number > raffle.total_numbers) {
            return res.status(400).json({ error: 'Número inválido' });
        }

        const existingParticipant = await db.get(
            'SELECT id FROM participants WHERE raffle_id = $1 AND number = $2',
            [id, number]
        );

        if (existingParticipant) {
            return res.status(400).json({ error: 'Número já foi escolhido' });
        }

        const result = await db.run(
            `INSERT INTO participants (raffle_id, number, name, email, phone, city, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id`,
            [id, number, sanitizedName, sanitizedEmail, sanitizedPhone, sanitizedCity, 'reserved']
        );

        res.json({
            participant_id: result.rows[0].id,
            message: 'Número reservado com sucesso',
            raffle_price: raffle.price_per_number
        });
    } catch (error) {
        console.error('Erro ao reservar número:', error);
        res.status(500).json({ error: 'Erro ao reservar número' });
    }
});

module.exports = router;