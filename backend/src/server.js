const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route Handlers
const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');
const summaryRoutes = require('./routes/summaryRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── Security & Core Middlewares ──────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Health and Diagnostics ───────────────────────────────────────────────────
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'SankshepAI Express API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to SankshepAI API Backend',
    endpoints: {
      auth: '/api/auth',
      onboarding: '/api/onboarding',
      user: '/api/user',
      documents: '/api/documents',
      summaries: '/api/summaries',
      collections: '/api/collections',
      analytics: '/api/analytics',
      health: '/health',
    },
  });
});

// ── Mount Application Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/user', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// ── Central Error Handling Middleware ────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[SankshepAI Backend] Running on http://localhost:${PORT}`);
        console.log(`[SankshepAI Backend] CORS enabled for client: ${CLIENT_URL}`);
      });
    })
    .catch((err) => {
      console.error('[SankshepAI Backend] Startup failure:', err.message);
      process.exit(1);
    });
}

module.exports = app;
