const express = require('express');
const db = require('../config/database');

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
            WHERE r.status = 'active'
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
        
        const raffle = await db.get('SELECT * FROM raffles WHERE id = ?', [id]);
        if (!raffle) {
            return res.status(404).json({ error: 'Rifa não encontrada' });
        }
        
        // Get sold numbers
        const soldNumbers = await db.all(
            'SELECT number FROM participants WHERE raffle_id = ? AND status IN ("reserved", "paid")',
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
            WHERE p.raffle_id = ? AND p.status IN ('reserved', 'paid')
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
            'SELECT id FROM participants WHERE raffle_id = ? AND number = ?',
            [id, number]
        );
        
        res.json({ available: !participant });
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        res.status(500).json({ error: 'Erro ao verificar disponibilidade' });
    }
});

// Reserve a number
router.post('/:id/reserve', async (req, res) => {
    try {
        const { id } = req.params;
        const { number, name, email, phone, city } = req.body;
        
        // Validation
        if (!number || !name || !email) {
            return res.status(400).json({ error: 'Número, nome e email são obrigatórios' });
        }
        
        if (!email.includes('@')) {
            return res.status(400).json({ error: 'Email inválido' });
        }
        
        // Check if raffle exists and is active
        const raffle = await db.get('SELECT * FROM raffles WHERE id = ? AND status = "active"', [id]);
        if (!raffle) {
            return res.status(404).json({ error: 'Rifa não encontrada ou inativa' });
        }
        
        // Check if number is valid
        if (number < 1 || number > raffle.total_numbers) {
            return res.status(400).json({ error: 'Número inválido' });
        }
        
        // Check if number is already taken
        const existingParticipant = await db.get(
            'SELECT id FROM participants WHERE raffle_id = ? AND number = ?',
            [id, number]
        );
        
        if (existingParticipant) {
            return res.status(400).json({ error: 'Número já foi escolhido' });
        }
        
        // Reserve the number
        const result = await db.run(
            'INSERT INTO participants (raffle_id, number, name, email, phone, city, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, number, name, email, phone, city, 'reserved']
        );
        
        res.json({
            participant_id: result.id,
            message: 'Número reservado com sucesso',
            raffle_price: raffle.price_per_number
        });
    } catch (error) {
        console.error('Erro ao reservar número:', error);
        res.status(500).json({ error: 'Erro ao reservar número' });
    }
});

module.exports = router;
