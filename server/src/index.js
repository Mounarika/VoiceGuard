import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import authRoutes from './routes/auth.js';
import voiceRoutes from './routes/voice.js';
import liveCallRoutes from './routes/liveCall.js';
import spamRoutes from './routes/spam.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database and pre-seed admin & demo accounts
initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded audio files
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/live-call', liveCallRoutes);
app.use('/api/spam', spamRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'VoiceGuard AI Forensic Server',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred.'
  });
});

app.listen(PORT, () => {
  console.log(`[VoiceGuard Server] Listening on http://localhost:${PORT}`);
  console.log(`[VoiceGuard Server] Admin account: admin@voiceguard.ai`);
});
