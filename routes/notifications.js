const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/database-postgresql');

const router = express.Router();

// Enviar notificação individual via WhatsApp
router.post('/whatsapp/:participantId', auth, async (req, res) => {
    try {
        const { participantId } = req.params;
        const { message } = req.body;

        const participant = await db.get(`
            SELECT p.*, r.title as raffle_title
            FROM participants p
            JOIN raffles r ON p.raffle_id = r.id
            WHERE p.id = $1
        `, [participantId]);

        if (!participant) {
            return res.status(404).json({ error: 'Participante não encontrado' });
        }

        if (!participant.phone) {
            return res.status(400).json({ error: 'Participante não possui WhatsApp cadastrado' });
        }

        const phoneFormatted = participant.phone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/55${phoneFormatted}?text=${encodeURIComponent(message)}`;

        res.json({
            success: true,
            whatsapp_url: whatsappUrl,
            participant: {
                name: participant.name,
                phone: participant.phone,
                number: participant.number,
                raffle_title: participant.raffle_title
            }
        });
    } catch (error) {
        console.error('Erro ao enviar notificação WhatsApp:', error);
        res.status(500).json({ error: 'Erro ao enviar notificação' });
    }
});

// Enviar notificações em lote
router.post('/whatsapp/bulk/:raffleId', auth, async (req, res) => {
    try {
        const { raffleId } = req.params;
        const { message, filter } = req.body;

        let whereClause = 'WHERE p.raffle_id = $1';
        const params = [raffleId];

        if (filter === 'paid') {
            whereClause += " AND p.status = 'paid'";
        } else if (filter === 'reserved') {
            whereClause += " AND p.status = 'reserved'";
        }

        const participants = await db.all(`
            SELECT p.*, r.title as raffle_title
            FROM participants p
            JOIN raffles r ON p.raffle_id = r.id
            ${whereClause}
            ORDER BY p.number
        `, params);

        const notifications = participants
            .filter(p => p.phone)
            .map(participant => {
                const phoneFormatted = participant.phone.replace(/\D/g, '');
                return {
                    name: participant.name,
                    phone: participant.phone,
                    number: participant.number,
                    whatsapp_url: `https://wa.me/55${phoneFormatted}?text=${encodeURIComponent(message)}`
                };
            });

        res.json({
            success: true,
            notifications,
            total: notifications.length
        });
    } catch (error) {
        console.error('Erro ao enviar notificações em lote:', error);
        res.status(500).json({ error: 'Erro ao enviar notificações' });
    }
});

// Gerar mensagem do vencedor
router.get('/winner-message/:raffleId', auth, async (req, res) => {
    try {
        const { raffleId } = req.params;

        const raffle = await db.get('SELECT * FROM raffles WHERE id = $1', [raffleId]);
        if (!raffle) {
            return res.status(404).json({ error: 'Rifa não encontrada' });
        }

        if (!raffle.winner_number) {
            return res.status(400).json({ error: 'Rifa ainda não foi sorteada' });
        }

        const winner = await db.get(`
            SELECT p.*, r.title as raffle_title
            FROM participants p
            JOIN raffles r ON p.raffle_id = r.id
            WHERE p.raffle_id = $1 AND p.number = $2
        `, [raffleId, raffle.winner_number]);

        const message = winner ? 
            `🎉 PARABÉNS! Você é o VENCEDOR da rifa "${raffle.title}"!\n\n` +
            `Número sorteado: ${raffle.winner_number}\n` +
            `Baseado no resultado da Loteria Federal: ${raffle.lottery_number}\n\n` +
            `Entre em contato conosco para retirar seu prêmio!` :
            `Resultado da rifa "${raffle.title}":\n\n` +
            `Número sorteado: ${raffle.winner_number}\n` +
            `Baseado no resultado da Loteria Federal: ${raffle.lottery_number}\n\n` +
            `Infelizmente este número não foi vendido.`;

        res.json({
            success: true,
            message,
            winner: winner || null,
            winner_number: raffle.winner_number,
            lottery_number: raffle.lottery_number
        });
    } catch (error) {
        console.error('Erro ao gerar mensagem do vencedor:', error);
        res.status(500).json({ error: 'Erro ao gerar mensagem' });
    }
});

module.exports = router;