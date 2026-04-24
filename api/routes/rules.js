const express = require('express');
const db      = require('../db');
const router  = express.Router();

// GET /api/rules
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM detection_rules ORDER BY id').all();
  res.json(rows.map(r => ({ ...r, active: Boolean(r.active) })));
});

// POST /api/rules
router.post('/', (req, res) => {
  const { name, condition, threshold, window, severity, active = true, mitre_tag = '' } = req.body;
  if (!name || !condition) {
    return res.status(400).json({ error: 'name and condition are required' });
  }

  const result = db.prepare(`
    INSERT INTO detection_rules (name, condition, threshold, window, severity, active, mitre_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, condition, threshold ?? '> 1', window ?? '5m',
         severity ?? 'Warning', active ? 1 : 0, mitre_tag);

  const created = db.prepare('SELECT * FROM detection_rules WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json({ ...created, active: Boolean(created.active) });
});

// PATCH /api/rules/:id
router.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM detection_rules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Rule not found' });

  const merged = {
    name:      req.body.name      ?? existing.name,
    condition: req.body.condition ?? existing.condition,
    threshold: req.body.threshold ?? existing.threshold,
    window:    req.body.window    ?? existing.window,
    severity:  req.body.severity  ?? existing.severity,
    mitre_tag: req.body.mitre_tag ?? existing.mitre_tag,
    active: req.body.active !== undefined
      ? (req.body.active ? 1 : 0)
      : existing.active,
  };

  db.prepare(`
    UPDATE detection_rules SET
      name=?, condition=?, threshold=?, window=?, severity=?, active=?, mitre_tag=?,
      updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')
    WHERE id=?
  `).run(merged.name, merged.condition, merged.threshold, merged.window,
         merged.severity, merged.active, merged.mitre_tag, req.params.id);

  const updated = db.prepare('SELECT * FROM detection_rules WHERE id = ?').get(req.params.id);
  res.json({ ...updated, active: Boolean(updated.active) });
});

module.exports = router;
