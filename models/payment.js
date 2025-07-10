// Dynamic database configuration
let db;
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql')) {
    db = require('../config/database-postgresql');
} 

class Payment {
    static async create(data) {
        const { participant_id, mercadopago_id, amount, qr_code, qr_code_base64 } = data;
        
        const result = await db.run(
            'INSERT INTO payments (participant_id, mercadopago_id, amount, qr_code, qr_code_base64, status) VALUES (?, ?, ?, ?, ?, ?)',
            [participant_id, mercadopago_id, amount, qr_code, qr_code_base64, 'pending']
        );
        
        return result.id;
    }
    
    static async findById(id) {
        return await db.get('SELECT * FROM payments WHERE id = ?', [id]);
    }
    
    static async findByMercadoPagoId(mercadopago_id) {
        return await db.get('SELECT * FROM payments WHERE mercadopago_id = ?', [mercadopago_id]);
    }
    
    static async updateStatus(mercadopago_id, status) {
        await db.run(
            'UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE mercadopago_id = ?',
            [status, mercadopago_id]
        );
    }
    
    static async findByParticipantId(participant_id) {
        return await db.get('SELECT * FROM payments WHERE participant_id = ?', [participant_id]);
    }
}

module.exports = Payment;
