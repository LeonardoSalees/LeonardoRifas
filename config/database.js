const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

class Database {
    constructor() {
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('Erro ao conectar com o banco de dados:', err);
                    reject(err);
                } else {
                    console.log('Conectado ao banco de dados SQLite');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS raffles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                total_numbers INTEGER NOT NULL,
                price_per_number REAL NOT NULL,
                draw_date TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                winner_number INTEGER,
                lottery_number TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                raffle_id INTEGER NOT NULL,
                number INTEGER NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                city TEXT,
                status TEXT DEFAULT 'reserved',
                payment_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (raffle_id) REFERENCES raffles(id),
                UNIQUE(raffle_id, number)
            )`,
            
            `CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                participant_id INTEGER NOT NULL,
                mercadopago_id TEXT,
                status TEXT DEFAULT 'pending',
                amount REAL NOT NULL,
                payment_method TEXT DEFAULT 'pix',
                qr_code TEXT,
                qr_code_base64 TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (participant_id) REFERENCES participants(id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const query of queries) {
            await this.run(query);
        }

        // Run migrations for existing tables
        await this.runMigrations();

        // Create default admin user if not exists
        await this.createDefaultAdmin();
    }

    async runMigrations() {
        try {
            // Check if phone column exists
            const phoneExists = await this.get(`PRAGMA table_info(participants)`);
            const hasPhone = phoneExists && phoneExists.name === 'phone';
            
            if (!hasPhone) {
                await this.run(`ALTER TABLE participants ADD COLUMN phone TEXT`);
            }
        } catch (error) {
            // Column already exists or other error, ignore
        }
        
        try {
            // Check if city column exists
            const cityExists = await this.get(`PRAGMA table_info(participants)`);
            const hasCity = cityExists && cityExists.name === 'city';
            
            if (!hasCity) {
                await this.run(`ALTER TABLE participants ADD COLUMN city TEXT`);
            }
        } catch (error) {
            // Column already exists or other error, ignore
        }
    }

    async createDefaultAdmin() {
        const bcrypt = require('bcrypt');
        const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        const query = `INSERT OR IGNORE INTO admin_users (username, password_hash) VALUES (?, ?)`;
        await this.run(query, ['admin', hashedPassword]);
    }

    run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    console.error('Erro na query:', err);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) {
                    console.error('Erro na query:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('Erro na query:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

module.exports = new Database();
