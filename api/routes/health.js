const express = require('express');
const db      = require('../db');
const router  = express.Router();

const OFFLINE_THRESHOLD_MS = 120_000; // 2 minutes

router.get('/', (req, res) => {
  const sources = db.prepare('SELECT * FROM log_sources ORDER BY id').all();

  const agents = sources.map(row => {
    const lastCheckIn = new Date(row.lastCheckIn);
    const diffMs      = Date.now() - lastCheckIn.getTime();
    const status      = diffMs <= OFFLINE_THRESHOLD_MS ? 'online' : 'offline';

    // Friendly human-readable lastCheckIn string matching the Agent interface
    const diffSec = Math.floor(diffMs / 1000);
    let lastCheckInStr;
    if (diffSec < 10)       lastCheckInStr = 'Just now';
    else if (diffSec < 60)  lastCheckInStr = `${diffSec} secs ago`;
    else if (diffSec < 3600) lastCheckInStr = `${Math.floor(diffSec / 60)} mins ago`;
    else                     lastCheckInStr = `${Math.floor(diffSec / 3600)} hours ago`;

    // Fetch last 20 diagnostic logs for this source
    const logs = db.prepare(`
      SELECT timestamp, level, message FROM diagnostic_logs
      WHERE source_id = ?
      ORDER BY timestamp DESC LIMIT 20
    `).all(row.node_id).reverse();

    return {
      id:          row.node_id,
      ip:          row.ip,
      status,
      lastCheckIn: lastCheckInStr,
      version:     row.version,
      logs,
    };
  });

  const onlineCount = agents.filter(a => a.status === 'online').length;

  res.json({
    agents_online: onlineCount,
    agents_total:  agents.length,
    agents,
  });
});

module.exports = router;
