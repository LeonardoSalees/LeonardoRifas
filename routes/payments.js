const express = require('express');
// Dynamic database configuration
let db;
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql')) {
    db = require('../config/database-postgresql');
} 
const mercadoPago = require('../config/mercadopago');
const SecurityValidator = require('../security/validation');

const router = express.Router();

// Create payment
router.post('/create', SecurityValidator.paymentRateLimit(), async (req, res) => {
    try {
        const { participant_id } = req.body;
        
        // Input validation
        if (!participant_id || !SecurityValidator.validateNumber(participant_id)) {
            return res.status(400).json({ error: 'ID do participante inválido' });
        }
        
        // Get participant and raffle info
        const participant = await db.get(`
            SELECT p.*, r.price_per_number, r.title
            FROM participants p
            JOIN raffles r ON p.raffle_id = r.id
            WHERE p.id = ?
        `, [participant_id]);
        
        if (!participant) {
            return res.status(404).json({ error: 'Participante não encontrado' });
        }
        
        if (participant.status === 'paid') {
            return res.status(400).json({ error: 'Número já foi pago' });
        }
        
        // Create payment with Mercado Pago
        const payment = await mercadoPago.createPixPayment(
            participant.price_per_number,
            `Rifa: ${participant.title} - Número ${participant.number}`,
            participant.email,
            participant.name
        );
        
        // Save payment info
        await db.run(
            'INSERT INTO payments (participant_id, mercadopago_id, amount, qr_code, qr_code_base64, status) VALUES (?, ?, ?, ?, ?, ?)',
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

// Check payment status
router.get('/:payment_id/status', async (req, res) => {
    try {
        const { payment_id } = req.params;
        
        const payment = await mercadoPago.getPaymentStatus(payment_id);
        
        // Update local payment status
        await db.run(
            'UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE mercadopago_id = ?',
            [payment.status, payment_id]
        );
        
        // If payment is approved, update participant status
        if (payment.status === 'approved') {
            await db.run(`
                UPDATE participants 
                SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
                WHERE id = (
                    SELECT participant_id 
                    FROM payments 
                    WHERE mercadopago_id = ?
                )
            `, [payment_id]);
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

// Webhook for payment notifications
router.post('/webhook', SecurityValidator.createRateLimit(60 * 1000, 50), async (req, res) => {
    try {
        const { data, action, type } = req.body;
        
        // Validate webhook data
        if (!data || !data.id || type !== 'payment') {
            console.log('Webhook inválido recebido:', req.body);
            return res.status(400).json({ error: 'Dados inválidos' });
        }
        
        // Log webhook received
        console.log(`Webhook recebido: ${action} para pagamento ${data.id}`);
        
        // Process only payment updates
        if (action === 'payment.updated' || action === 'payment.created') {
            const paymentResult = await mercadoPago.processWebhook(data.id);
            
            // Update payment status
            await db.run(
                'UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE mercadopago_id = ?',
                [paymentResult.status, data.id]
            );
            
            // If payment approved, update participant
            if (paymentResult.approved) {
                await db.run(`
                    UPDATE participants 
                    SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
                    WHERE id = (
                        SELECT participant_id 
                        FROM payments 
                        WHERE mercadopago_id = ?
                    )
                `, [data.id]);
                
                console.log(`Pagamento ${data.id} aprovado - participante atualizado`);
            }
        }
        
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});

// Simulate payment approval (for testing)
router.post('/simulate-approval', async (req, res) => {
    try {
        const { payment_id } = req.body;
        
        if (!payment_id) {
            return res.status(400).json({ error: 'ID do pagamento é obrigatório' });
        }
        
        // Update payment status to approved
        await db.run(
            'UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE mercadopago_id = ?',
            ['approved', payment_id]
        );
        
        // Update participant status
        await db.run(`
            UPDATE participants 
            SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
            WHERE id = (
                SELECT participant_id 
                FROM payments 
                WHERE mercadopago_id = ?
            )
        `, [payment_id]);
        
        res.json({ message: 'Pagamento simulado como aprovado' });
    } catch (error) {
        console.error('Erro ao simular aprovação:', error);
        res.status(500).json({ error: 'Erro ao simular pagamento' });
    }
});

module.exports = router;
