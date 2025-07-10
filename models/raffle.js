// Dynamic database configuration
let db;
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql')) {
    db = require('../config/database-postgresql');
} 

class Raffle {
    static async create(data) {
        const { title, description, total_numbers, price_per_number, draw_date } = data;
        
        const result = await db.run(
            'INSERT INTO raffles (title, description, total_numbers, price_per_number, draw_date) VALUES (?, ?, ?, ?, ?)',
            [title, description, total_numbers, price_per_number, draw_date]
        );
        
        return result.id;
    }
    
    static async findById(id) {
        return await db.get('SELECT * FROM raffles WHERE id = ?', [id]);
    }
    
    static async findAll() {
        return await db.all('SELECT * FROM raffles ORDER BY created_at DESC');
    }
    
    static async findActive() {
        return await db.all('SELECT * FROM raffles WHERE status = "active" ORDER BY created_at DESC');
    }
    
    static async update(id, data) {
        const { title, description, total_numbers, price_per_number, draw_date, status } = data;
        
        await db.run(
            'UPDATE raffles SET title = ?, description = ?, total_numbers = ?, price_per_number = ?, draw_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, description, total_numbers, price_per_number, draw_date, status, id]
        );
    }
    
    static async delete(id) {
        await db.run('DELETE FROM raffles WHERE id = ?', [id]);
    }
    
    static async getStats(id) {
        const stats = await db.get(`
            SELECT 
                r.total_numbers,
                COUNT(p.id) as sold_numbers,
                SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END) as paid_numbers,
                SUM(CASE WHEN p.status = 'paid' THEN r.price_per_number ELSE 0 END) as total_revenue
            FROM raffles r
            LEFT JOIN participants p ON r.id = p.raffle_id
            WHERE r.id = ?
            GROUP BY r.id
        `, [id]);
        
        return stats;
    }
    
    static async getSoldNumbers(id) {
        const numbers = await db.all(
            'SELECT number FROM participants WHERE raffle_id = ? AND status IN ("reserved", "paid") ORDER BY number',
            [id]
        );
        
        return numbers.map(n => n.number);
    }
}

module.exports = Raffle;
