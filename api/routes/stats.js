const express = require('express');
const db      = require('../db');
const router  = express.Router();

router.get('/', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const totals = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN severity='Critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity='Warning'  THEN 1 ELSE 0 END) as warning
    FROM alerts
    WHERE date(timestamp) = ?
  `).get(today);

  // 13 data points matching the chart's time labels
  const labels = ['00:00','02:00','04:00','06:00','08:00','10:00','12:00',
                  '14:00','16:00','18:00','20:00','22:00','Now'];

  const chartData = labels.map((label, i) => {
    const hoursAgo = (labels.length - 1 - i) * 2;
    const row = db.prepare(`
      SELECT COUNT(*) as cnt FROM alerts
      WHERE timestamp >= datetime('now', '-' || ? || ' hours')
        AND timestamp <  datetime('now', '-' || ? || ' hours')
    `).get(hoursAgo + 2, hoursAgo);
    return { time: label, count: row.cnt };
  });

  res.json({
    total_alerts:   totals.total    ?? 0,
    critical_count: totals.critical ?? 0,
    warning_count:  totals.warning  ?? 0,
    chart_data:     chartData,
  });
});

module.exports = router;
