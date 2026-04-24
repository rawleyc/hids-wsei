const express = require('express');
const db      = require('../db');
const router  = express.Router();

// GET /api/alerts
router.get('/', (req, res) => {
  const { severity, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  const params     = [];

  if (severity) { conditions.push('severity = ?'); params.push(severity); }
  if (status)   { conditions.push('status = ?');   params.push(status); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM alerts ${where}`)
    .get(...params).cnt;

  const rows = db.prepare(`
    SELECT id, timestamp, rule, user, sourceIP, severity, status, nodeId, processId, ttpTag
    FROM alerts ${where}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({ total, page: parseInt(page), limit: parseInt(limit), data: rows });
});

// GET /api/alerts/:id
router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT a.id, a.timestamp, a.rule, a.user, a.sourceIP, a.severity,
           a.status, a.nodeId, a.processId, a.ttpTag,
           r.raw_line as rawLog
    FROM alerts a
    LEFT JOIN normalized_events ne ON ne.id = a.event_id
    LEFT JOIN raw_logs r ON r.id = ne.raw_log_id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Alert not found' });
  res.json(row);
});

// PATCH /api/alerts/:id/acknowledge
router.patch('/:id/acknowledge', (req, res) => {
  const row = db.prepare('SELECT id, status FROM alerts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Alert not found' });

  const newStatus = row.status === 'Resolved' ? 'Open' : 'Resolved';
  db.prepare('UPDATE alerts SET status = ? WHERE id = ?').run(newStatus, req.params.id);
  res.json({ id: parseInt(req.params.id), status: newStatus });
});

module.exports = router;
