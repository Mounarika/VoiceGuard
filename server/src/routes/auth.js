import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { JWT_SECRET, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Public endpoint to get pre-configured system credentials
 * As requested: "include logins for both user and admin and give the details of admin before itself"
 */
router.get('/demo-credentials', (req, res) => {
  res.json({
    admin: {
      email: 'admin@voiceguard.ai',
      password: 'Admin@VoiceGuard2026!',
      role: 'admin',
      label: 'System Security Administrator'
    },
    user: {
      email: 'user@voiceguard.ai',
      password: 'User@VoiceGuard2026!',
      role: 'user',
      label: 'Security Analyst / Enterprise User'
    }
  });
});

/**
 * Login endpoint
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

/**
 * Register endpoint
 */
router.post('/register', (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full name are required.' });
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES (?, ?, ?, 'user')
    `);
    const result = stmt.run(email.trim().toLowerCase(), passwordHash, full_name.trim());
    const newUserId = result.lastInsertRowid;

    // Create default sample contact for new user
    db.prepare(`
      INSERT INTO callers (user_id, phone_number, name, spam_score, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(newUserId, '+1 (555) 012-3456', 'Verified Executive Office', 5, 'trusted');

    const token = jwt.sign(
      { id: newUserId, email: email.trim().toLowerCase(), full_name: full_name.trim(), role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUserId,
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
        role: 'user'
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to create user account.' });
  }
});

/**
 * Get current profile from token
 */
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, full_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  res.json({ user });
});

export default router;
