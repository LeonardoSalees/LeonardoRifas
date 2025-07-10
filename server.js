const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session); // para usar PostgreSQL nas sessões
const path = require('path');
const cors = require('cors');
const SecurityValidator = require('./security/validation');
require('dotenv').config();

// Importa rotas
const adminRoutes = require('./routes/admin');
const raffleRoutes = require('./routes/raffles');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const authRoutes = require('./routes/auth');

// Usa somente PostgreSQL
const db = require('./config/database-postgresql');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware de segurança
app.set('trust proxy', 1);
app.use(SecurityValidator.securityHeaders());
app.use(SecurityValidator.createRateLimit());

// Middlewares gerais
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sessão com PostgreSQL
app.use(
  session({
    store: new pgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session',
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'rifa-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'strict'
    }
  })
);

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/api/raffles', raffleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Rota 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicializa banco e servidor
db.initialize()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erro ao inicializar banco de dados:', err);
    process.exit(1);
  });

module.exports = app;