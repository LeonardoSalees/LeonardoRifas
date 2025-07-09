const { Pool } = require('pg');
const bcrypt = require('bcrypt');

class PostgreSQLDatabase {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async initialize() {
        try {
            console.log('Conectando ao banco PostgreSQL...');
            
            // Test connection
            const client = await this.pool.connect();
            console.log('Conectado ao banco de dados PostgreSQL');
            client.release();
            
            await this.createTables();
            await this.createDefaultAdmin();
            
            console.log('Banco PostgreSQL inicializado com sucesso!');
        } catch (error) {
            console.error('Erro ao inicializar banco PostgreSQL:', error);
            throw error;
        }
    }

    async createTables() {
        const createTablesQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS raffles (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                total_numbers INTEGER NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                draw_date DATE NOT NULL,
                is_active BOOLEAN DEFAULT true,
                winner_number INTEGER,
                lottery_number VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS participants (
                id SERIAL PRIMARY KEY,
                raffle_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                whatsapp VARCHAR(20),
                phone VARCHAR(20),
                city VARCHAR(100),
                number INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (raffle_id) REFERENCES raffles(id) ON DELETE CASCADE,
                UNIQUE(raffle_id, number)
            );

            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                participant_id INTEGER NOT NULL,
                mercadopago_id VARCHAR(255) UNIQUE,
                amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                payment_method VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_raffles_active ON raffles(is_active);
            CREATE INDEX IF NOT EXISTS idx_participants_raffle ON participants(raffle_id);
            CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
            CREATE INDEX IF NOT EXISTS idx_payments_mercadopago ON payments(mercadopago_id);
            CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
        `;

        await this.pool.query(createTablesQuery);
        console.log('Tabelas PostgreSQL criadas com sucesso');
    }

    async createDefaultAdmin() {
        try {
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            
            const checkAdmin = 'SELECT id FROM users WHERE username = $1';
            const result = await this.pool.query(checkAdmin, ['admin']);
            
            if (result.rows.length === 0) {
                const createAdmin = 'INSERT INTO users (username, password_hash) VALUES ($1, $2)';
                await this.pool.query(createAdmin, ['admin', hashedPassword]);
                console.log('Usuário admin criado com sucesso');
                console.log(`Senha admin: ${adminPassword}`);
            } else {
                console.log('Usuário admin já existe');
            }
        } catch (error) {
            console.error('Erro ao criar usuário admin:', error);
        }
    }

    async query(text, params = []) {
        try {
            const result = await this.pool.query(text, params);
            return result;
        } catch (error) {
            console.error('Erro na query PostgreSQL:', error);
            throw error;
        }
    }

    async run(query, params = []) {
        const result = await this.query(query, params);
        return result;
    }

    async get(query, params = []) {
        const result = await this.query(query, params);
        return result.rows[0] || null;
    }

    async all(query, params = []) {
        const result = await this.query(query, params);
        return result.rows;
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = new PostgreSQLDatabase();