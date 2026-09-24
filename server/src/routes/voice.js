import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import AudioDSPAnalyzer from '../services/dspAnalyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.wav';
    cb(null, `voice-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB to allow arbitrarily long recordings
});

const router = express.Router();

/**
 * Upload & Analyze audio for AI cloned vs Genuine voice
 */
router.post('/analyze', authenticateToken, upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required for forensic analysis.' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname || 'VoiceSample.wav';

    // Run DSP analysis on full audio of any length
    const analysis = AudioDSPAnalyzer.analyzeAudio(filePath, originalName);

    // Save analysis record scoped privately to user
    const insertStmt = db.prepare(`
      INSERT INTO voice_analyses (
        user_id, sample_name, file_path, duration, is_ai, confidence_score,
        characteristics_json, ai_reasons_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      req.user.id,
      originalName,
      req.file.filename,
      analysis.duration,
      analysis.isAi ? 1 : 0,
      analysis.confidenceScore,
      JSON.stringify(analysis.characteristics),
      JSON.stringify(analysis.aiReasons)
    );

    res.json({
      analysisId: result.lastInsertRowid,
      fileName: originalName,
      fileUrl: `/uploads/${req.file.filename}`,
      duration: analysis.duration,
      isAi: analysis.isAi,
      confidenceScore: analysis.confidenceScore,
      aiReasons: analysis.aiReasons,
      characteristics: analysis.characteristics,
      featureVector: analysis.featureVector
    });
  } catch (err) {
    console.error('Audio analysis error:', err);
    res.status(500).json({ error: 'Failed to process and analyze audio recording: ' + err.message });
  }
});

/**
 * Save / Enroll a Genuine Voice into the user's private Genuine Voice Vault
 */
router.post('/save-genuine', authenticateToken, (req, res) => {
  try {
    const { callerId, callerName, callerPhone, callerEmail, sampleName, duration, characteristics, featureVector, fileName } = req.body;

    if (!callerName || !characteristics || !featureVector) {
      return res.status(400).json({ error: 'Caller name, acoustic characteristics, and feature vector are required.' });
    }

    let resolvedCallerId = callerId;

    // Check or create caller under this user with real user-provided contact info
    if (!resolvedCallerId) {
      const existingCaller = db.prepare('SELECT id FROM callers WHERE user_id = ? AND name = ?')
        .get(req.user.id, callerName.trim());

      if (existingCaller) {
        resolvedCallerId = existingCaller.id;
        if (callerPhone || callerEmail) {
          db.prepare('UPDATE callers SET phone_number = COALESCE(?, phone_number), email = COALESCE(?, email) WHERE id = ?')
            .run(callerPhone?.trim() || null, callerEmail?.trim() || null, resolvedCallerId);
        }
      } else {
        const insertCaller = db.prepare(`
          INSERT INTO callers (user_id, phone_number, email, name, spam_score, status)
          VALUES (?, ?, ?, ?, 0, 'trusted')
        `).run(req.user.id, callerPhone?.trim() || null, callerEmail?.trim() || null, callerName.trim());
        resolvedCallerId = insertCaller.lastInsertRowid;
      }
    }

    const stmt = db.prepare(`
      INSERT INTO genuine_voice_reports (
        user_id, caller_id, caller_name, caller_phone, caller_email, sample_name, file_path, duration, characteristics_json, feature_vector_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      req.user.id,
      resolvedCallerId,
      callerName.trim(),
      callerPhone?.trim() || null,
      callerEmail?.trim() || null,
      sampleName || 'genuine_voiceprint.wav',
      fileName || null,
      duration || 5.0,
      typeof characteristics === 'string' ? characteristics : JSON.stringify(characteristics),
      typeof featureVector === 'string' ? featureVector : JSON.stringify(featureVector)
    );

    res.status(201).json({
      message: 'Genuine voice successfully enrolled into your private voice vault.',
      reportId: result.lastInsertRowid,
      callerId: resolvedCallerId
    });
  } catch (err) {
    console.error('Error saving genuine voice report:', err);
    res.status(500).json({ error: 'Failed to enroll genuine voice report: ' + err.message });
  }
});

/**
 * Get private genuine voice reports for current user
 */
router.get('/genuine-reports', authenticateToken, (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT g.*, COALESCE(g.caller_phone, c.phone_number) as phone_number, COALESCE(g.caller_email, c.email) as email, c.spam_score, c.carrier, c.status as caller_status
      FROM genuine_voice_reports g
      LEFT JOIN callers c ON g.caller_id = c.id
      WHERE g.user_id = ?
      ORDER BY g.created_at DESC
    `).all(req.user.id);

    const parsedReports = reports.map(r => ({
      ...r,
      characteristics: JSON.parse(r.characteristics_json || '{}'),
      featureVector: JSON.parse(r.feature_vector_json || '[]')
    }));

    res.json({ reports: parsedReports });
  } catch (err) {
    console.error('Error fetching genuine reports:', err);
    res.status(500).json({ error: 'Failed to retrieve genuine voice reports.' });
  }
});

/**
 * Delete a genuine voice report
 */
router.delete('/genuine-reports/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM genuine_voice_reports WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Report not found or permission denied.' });
    }

    res.json({ message: 'Voice report removed from vault.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete report.' });
  }
});

/**
 * Get private voice analysis history for current user
 */
router.get('/history', authenticateToken, (req, res) => {
  try {
    const history = db.prepare(`
      SELECT * FROM voice_analyses
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.user.id);

    const parsed = history.map(h => ({
      ...h,
      characteristics: JSON.parse(h.characteristics_json || '{}'),
      aiReasons: JSON.parse(h.ai_reasons_json || '[]')
    }));

    res.json({ history: parsed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve analysis history.' });
  }
});

export default router;
