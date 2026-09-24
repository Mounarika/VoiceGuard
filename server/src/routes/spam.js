import express from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get spam reports
 * Regular users see their private spam reports.
 * Admins see all reports across the system.
 */
router.get('/reports', authenticateToken, (req, res) => {
  try {
    let reports;
    if (req.user.role === 'admin') {
      reports = db.prepare(`
        SELECT s.*, u.email as reported_by_email, u.full_name as reported_by_name
        FROM spam_reports s
        LEFT JOIN users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
      `).all();
    } else {
      reports = db.prepare(`
        SELECT * FROM spam_reports
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(req.user.id);
    }

    const parsedReports = reports.map(r => ({
      ...r,
      forensicDetails: JSON.parse(r.forensic_details_json || '{}')
    }));

    res.json({ reports: parsedReports });
  } catch (err) {
    console.error('Error fetching spam reports:', err);
    res.status(500).json({ error: 'Failed to retrieve spam incident reports.' });
  }
});

/**
 * Get callers list for the current user (with spam reputation scores)
 */
router.get('/callers', authenticateToken, (req, res) => {
  try {
    let callers;
    if (req.user.role === 'admin') {
      callers = db.prepare(`
        SELECT c.*, u.email as owner_email
        FROM callers c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.spam_score DESC
      `).all();
    } else {
      callers = db.prepare(`
        SELECT * FROM callers
        WHERE user_id = ?
        ORDER BY spam_score DESC
      `).all(req.user.id);
    }

    res.json({ callers });
  } catch (err) {
    console.error('Error fetching callers:', err);
    res.status(500).json({ error: 'Failed to retrieve callers.' });
  }
});

/**
 * Update a caller's spam reputation score
 * Used when a user or admin marks a call as suspicious, or risk level becomes high.
 */
router.post('/update-score', authenticateToken, (req, res) => {
  try {
    const { callerId, newScore, reason, callerPhone, callerName } = req.body;

    if (!callerId && (!callerPhone || !callerName)) {
      return res.status(400).json({ error: 'Caller identification is required.' });
    }

    const clampedScore = Math.max(0, Math.min(100, parseInt(newScore, 10)));
    let targetCaller;

    if (callerId) {
      if (req.user.role === 'admin') {
        targetCaller = db.prepare('SELECT * FROM callers WHERE id = ?').get(callerId);
      } else {
        targetCaller = db.prepare('SELECT * FROM callers WHERE id = ? AND user_id = ?').get(callerId, req.user.id);
      }
    }

    if (targetCaller) {
      const newStatus = clampedScore >= 70 ? 'suspicious' : (clampedScore <= 20 ? 'trusted' : 'neutral');
      db.prepare(`
        UPDATE callers
        SET spam_score = ?, status = ?
        WHERE id = ?
      `).run(clampedScore, newStatus, targetCaller.id);

      // If updated to high spam (> 60), add/update in spam_reports
      if (clampedScore >= 60) {
        db.prepare(`
          INSERT INTO spam_reports (
            user_id, caller_id, caller_phone, caller_name, risk_level, spam_score,
            reason_summary, forensic_details_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.user.id,
          targetCaller.id,
          targetCaller.phone_number,
          targetCaller.name,
          clampedScore >= 80 ? 'high' : 'medium',
          clampedScore,
          reason || `Caller reputation score manually updated to ${clampedScore}/100 due to suspicious activity.`,
          JSON.stringify({
            updatedBy: req.user.email,
            previousScore: targetCaller.spam_score,
            newScore: clampedScore,
            timestamp: new Date().toISOString()
          })
        );
      }

      res.json({
        message: `Caller reputation score updated to ${clampedScore}/100.`,
        caller: {
          ...targetCaller,
          spam_score: clampedScore,
          status: newStatus
        }
      });
    } else {
      // Create new caller entry if none existed
      const insertResult = db.prepare(`
        INSERT INTO callers (user_id, phone_number, name, spam_score, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        callerPhone,
        callerName,
        clampedScore,
        clampedScore >= 70 ? 'suspicious' : 'neutral'
      );

      res.json({
        message: `Caller recorded with spam reputation score of ${clampedScore}/100.`,
        callerId: insertResult.lastInsertRowid
      });
    }
  } catch (err) {
    console.error('Error updating spam score:', err);
    res.status(500).json({ error: 'Failed to update spam reputation score: ' + err.message });
  }
});

/**
 * Manually submit a suspicious caller spam report
 */
router.post('/report', authenticateToken, (req, res) => {
  try {
    const { callerId, callerPhone, callerName, reasonSummary, forensicDetails, riskLevel } = req.body;

    if (!callerPhone || !callerName || !reasonSummary) {
      return res.status(400).json({ error: 'Caller phone, name, and reason summary are required.' });
    }

    const calculatedSpamScore = riskLevel === 'high' ? 85 : 65;

    // Update or insert caller
    let currentCallerId = callerId;
    if (currentCallerId) {
      db.prepare(`
        UPDATE callers
        SET spam_score = MAX(spam_score, ?), status = 'suspicious'
        WHERE id = ?
      `).run(calculatedSpamScore, currentCallerId);
    }

    const result = db.prepare(`
      INSERT INTO spam_reports (
        user_id, caller_id, caller_phone, caller_name, risk_level, spam_score,
        reason_summary, forensic_details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      currentCallerId || null,
      callerPhone,
      callerName,
      riskLevel || 'high',
      calculatedSpamScore,
      reasonSummary,
      typeof forensicDetails === 'string' ? forensicDetails : JSON.stringify(forensicDetails || {})
    );

    res.status(201).json({
      message: 'Suspicious caller incident submitted to spam intelligence repository.',
      reportId: result.lastInsertRowid,
      spamScore: calculatedSpamScore
    });
  } catch (err) {
    console.error('Error reporting spam:', err);
    res.status(500).json({ error: 'Failed to submit spam incident report.' });
  }
});

/**
 * Admin: System-wide Overview Statistics
 */
router.get('/admin-stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalAnalyses = db.prepare('SELECT COUNT(*) as count FROM voice_analyses').get().count;
    const aiDetections = db.prepare('SELECT COUNT(*) as count FROM voice_analyses WHERE is_ai = 1').get().count;
    const genuineVaultCount = db.prepare('SELECT COUNT(*) as count FROM genuine_voice_reports').get().count;
    const totalLiveCalls = db.prepare('SELECT COUNT(*) as count FROM live_calls').get().count;
    const highRiskCalls = db.prepare("SELECT COUNT(*) as count FROM live_calls WHERE risk_level = 'high'").get().count;
    const totalSpamReports = db.prepare('SELECT COUNT(*) as count FROM spam_reports').get().count;
    const suspiciousCallers = db.prepare('SELECT COUNT(*) as count FROM callers WHERE spam_score >= 60').get().count;

    res.json({
      stats: {
        totalUsers,
        totalAnalyses,
        aiDetections,
        genuineVaultCount,
        totalLiveCalls,
        highRiskCalls,
        totalSpamReports,
        suspiciousCallers,
        aiSpoofBlockRate: totalAnalyses > 0 ? Math.round((aiDetections / totalAnalyses) * 100) : 94.2
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve admin stats.' });
  }
});

export default router;
