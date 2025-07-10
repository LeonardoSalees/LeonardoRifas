// Dynamic database configuration
const db = require('../config/database-postgresql');

class Payment {
    static async create(data) {
        const { participant_id, mercadopago_id, amount, qr_code, qr_code_base64 } = data;
        
        const result = await db.run(
            'INSERT INTO payments (participant_id, mercadopago_id, amount, qr_code, qr_code_base64, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [participant_id, mercadopago_id, amount, qr_code, qr_code_base64, 'pending']
        );
        
        return result.rows[0].id; // PostgreSQL: pega o id retornado
    }
    
    static async findById(id) {
        return await db.get('SELECT * FROM payments WHERE id = $1', [id]);
    }
    
    static async findByMercadoPagoId(mercadopago_id) {
        return await db.get('SELECT * FROM payments WHERE mercadopago_id = $1', [mercadopago_id]);
    }
    
    static async updateStatus(mercadopago_id, status) {
        await db.run(
            'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE mercadopago_id = $2',
            [status, mercadopago_id]
        );
    }
    
    static async findByParticipantId(participant_id) {
        return await db.get('SELECT * FROM payments WHERE participant_id = $1', [participant_id]);
    }
}

module.exports = Payment;