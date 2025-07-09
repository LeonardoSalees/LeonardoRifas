// Dynamic database configuration
let db;
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql')) {
    db = require('../config/database-postgresql');
} else if (process.env.VERCEL === '1') {
    db = require('../config/database-vercel');
} else {
    db = require('../config/database');
}

class Participant {
    static async create(data) {
        const { raffle_id, number, name, email, phone, city } = data;
        
        const result = await db.run(
            'INSERT INTO participants (raffle_id, number, name, email, phone, city, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [raffle_id, number, name, email, phone, city, 'reserved']
        );
        
        return result.id;
    }
    
    static async findById(id) {
        return await db.get('SELECT * FROM participants WHERE id = ?', [id]);
    }
    
    static async findByRaffleId(raffle_id) {
        return await db.all(
            'SELECT * FROM participants WHERE raffle_id = ? ORDER BY number',
            [raffle_id]
        );
    }
    
    static async findByNumber(raffle_id, number) {
        return await db.get(
            'SELECT * FROM participants WHERE raffle_id = ? AND number = ?',
            [raffle_id, number]
        );
    }
    
    static async updateStatus(id, status) {
        await db.run(
            'UPDATE participants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, id]
        );
    }
    
    static async isNumberAvailable(raffle_id, number) {
        const participant = await db.get(
            'SELECT id FROM participants WHERE raffle_id = ? AND number = ?',
            [raffle_id, number]
        );
        
        return !participant;
    }
    
    static async getByRaffleWithPayments(raffle_id) {
        return await db.all(`
            SELECT p.*, pay.status as payment_status, pay.qr_code, pay.mercadopago_id
            FROM participants p
            LEFT JOIN payments pay ON p.id = pay.participant_id
            WHERE p.raffle_id = ?
            ORDER BY p.number
        `, [raffle_id]);
    }
}

module.exports = Participant;
