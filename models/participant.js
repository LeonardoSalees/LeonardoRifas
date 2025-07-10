// Dynamic database configuration
const db = require('../config/database-postgresql');

class Participant {
    static async create(data) {
        const { raffle_id, number, name, email, phone, city } = data;
        
        const result = await db.run(
            'INSERT INTO participants (raffle_id, number, name, email, phone, city, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [raffle_id, number, name, email, phone, city, 'reserved']
        );
        
        return result.rows[0].id; // PostgreSQL retorna em rows
    }

    static async findById(id) {
        return await db.get('SELECT * FROM participants WHERE id = $1', [id]);
    }

    static async findByRaffleId(raffle_id) {
        return await db.all(
            'SELECT * FROM participants WHERE raffle_id = $1 ORDER BY number',
            [raffle_id]
        );
    }

    static async findByNumber(raffle_id, number) {
        return await db.get(
            'SELECT * FROM participants WHERE raffle_id = $1 AND number = $2',
            [raffle_id, number]
        );
    }

    static async updateStatus(id, status) {
        await db.run(
            'UPDATE participants SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, id]
        );
    }

    static async isNumberAvailable(raffle_id, number) {
        const participant = await db.get(
            'SELECT id FROM participants WHERE raffle_id = $1 AND number = $2',
            [raffle_id, number]
        );

        return !participant;
    }

    static async getByRaffleWithPayments(raffle_id) {
        return await db.all(`
            SELECT p.*, pay.status as payment_status, pay.qr_code, pay.mercadopago_id
            FROM participants p
            LEFT JOIN payments pay ON p.id = pay.participant_id
            WHERE p.raffle_id = $1
            ORDER BY p.number
        `, [raffle_id]);
    }
}

module.exports = Participant;