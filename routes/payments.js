const express = require('express');
const db = require('../config/database-postgresql');
const mercadoPago = require('../config/mercadopago');
const SecurityValidator = require('../security/validation');

const router = express.Router();

// Criar pagamento
router.post('/create', SecurityValidator.paymentRateLimit(), async (req, res) => {
    try {
        const { participant_id } = req.body;

        if (!participant_id || !SecurityValidator.validateNumber(participant_id)) {
            return res.status(400).json({ error: 'ID do participante inválido' });
        }

        const participant = await db.get(`
            SELECT p.*, r.price_per_number, r.title
            FROM participants p
            JOIN raffles r ON p.raffle_id = r.id
            WHERE p.id = $1
        `, [participant_id]);

        if (!participant) {
            return res.status(404).json({ error: 'Participante não encontrado' });
        }

        if (participant.status === 'paid') {
            return res.status(400).json({ error: 'Número já foi pago' });
        }

        const payment = await mercadoPago.createPixPayment(
            participant.price_per_number,
            `Rifa: ${participant.title} - Número ${participant.number}`,
            participant.email,
            participant.name
        );

        await db.run(
            `INSERT INTO payments (participant_id, mercadopago_id, amount, qr_code, qr_code_base64, status) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                participant_id,
                payment.id,
                participant.price_per_number,
                payment.point_of_interaction?.transaction_data?.qr_code || null,
                payment.point_of_interaction?.transaction_data?.qr_code_base64 || null,
                'pending'
            ]
        );

        res.json({
            payment_id: payment.id,
            qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
            amount: participant.price_per_number,
            message: 'Pagamento criado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar pagamento:', error);
        res.status(500).json({ error: 'Erro ao processar pagamento' });
    }
});

// Verificar status do pagamento
router.get('/:payment_id/status', async (req, res) => {
    try {
        const { payment_id } = req.params;

        const payment = await mercadoPago.getPaymentStatus(payment_id);

        await db.run(
            `UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE mercadopago_id = $2`,
            [payment.status, payment_id]
        );

        if (payment.status === 'approved') {
            await db.run(
                `UPDATE participants 
                 SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
                 WHERE id = (
                     SELECT participant_id FROM payments WHERE mercadopago_id = $1
                 )`,
                [payment_id]
            );
        }

        res.json({
            status: payment.status,
            approved: payment.status === 'approved'
        });
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        res.status(500).json({ error: 'Erro ao verificar status do pagamento' });
    }
});

// Webhook Mercado Pago
router.post('/webhook', SecurityValidator.createRateLimit(60 * 1000, 50), async (req, res) => {
    try {
        const { data, action, type } = req.body;

        if (!data || !data.id || type !== 'payment') {
            console.log('Webhook inválido recebido:', req.body);
            return res.status(400).json({ error: 'Dados inválidos' });
        }

        console.log(`Webhook recebido: ${action} para pagamento ${data.id}`);

        if (action === 'payment.updated' || action === 'payment.created') {
            const paymentResult = await mercadoPago.processWebhook(data.id);

            await db.run(
                `UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE mercadopago_id = $2`,
                [paymentResult.status, data.id]
            );

            if (paymentResult.approved) {
                await db.run(
                    `UPDATE participants 
                     SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
                     WHERE id = (
                         SELECT participant_id FROM payments WHERE mercadopago_id = $1
                     )`,
                    [data.id]
                );

                console.log(`Pagamento ${data.id} aprovado - participante atualizado`);
            }
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});

// Simular aprovação
router.post('/simulate-approval', async (req, res) => {
    try {
        const { payment_id } = req.body;

        if (!payment_id) {
            return res.status(400).json({ error: 'ID do pagamento é obrigatório' });
        }

        await db.run(
            `UPDATE payments SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE mercadopago_id = $1`,
            [payment_id]
        );

        await db.run(
            `UPDATE participants 
             SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
             WHERE id = (
                 SELECT participant_id FROM payments WHERE mercadopago_id = $1
             )`,
            [payment_id]
        );

        res.json({ message: 'Pagamento simulado como aprovado' });
    } catch (error) {
        console.error('Erro ao simular aprovação:', error);
        res.status(500).json({ error: 'Erro ao simular pagamento' });
    }
});

module.exports = router;