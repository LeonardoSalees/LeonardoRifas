const { MercadoPagoConfig, Payment } = require('mercadopago');

class MercadoPagoService {
    constructor() {
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        
        if (!accessToken) {
            console.warn('MERCADOPAGO_ACCESS_TOKEN não configurado. Usando modo de teste.');
            this.client = null;
            return;
        }

        this.client = new MercadoPagoConfig({
            accessToken: accessToken,
            options: {
                timeout: 5000,
                idempotencyKey: 'abc'
            }
        });
        
        this.payment = new Payment(this.client);
    }

    async createPixPayment(amount, description, payerEmail, payerName) {
        if (!this.client) {
            // Simulate payment creation for testing
            return {
                id: 'test_' + Date.now(),
                point_of_interaction: {
                    transaction_data: {
                        qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PIX_SIMULADO',
                        qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                    }
                },
                status: 'pending'
            };
        }

        try {
            const payment = await this.payment.create({
                body: {
                    transaction_amount: amount,
                    description: description,
                    payment_method_id: 'pix',
                    payer: {
                        email: payerEmail,
                        first_name: payerName.split(' ')[0],
                        last_name: payerName.split(' ').slice(1).join(' ') || ''
                    }
                }
            });

            return payment;
        } catch (error) {
            console.error('Erro ao criar pagamento PIX:', error);
            throw new Error('Erro ao processar pagamento PIX');
        }
    }

    async getPaymentStatus(paymentId) {
        if (!this.client) {
            // Simulate payment status check
            return {
                id: paymentId,
                status: Math.random() > 0.5 ? 'approved' : 'pending'
            };
        }

        try {
            const payment = await this.payment.get({ id: paymentId });
            return payment;
        } catch (error) {
            console.error('Erro ao consultar status do pagamento:', error);
            throw new Error('Erro ao consultar status do pagamento');
        }
    }

    async processWebhook(paymentId) {
        try {
            const payment = await this.getPaymentStatus(paymentId);
            return {
                id: payment.id,
                status: payment.status,
                approved: payment.status === 'approved'
            };
        } catch (error) {
            console.error('Erro ao processar webhook:', error);
            throw error;
        }
    }
}

module.exports = new MercadoPagoService();
