const express = require('express');
const { exec } = require('child_process');
const router  = express.Router();

router.post('/:id/restart', (req, res) => {
  exec('sudo systemctl restart hids', (err, _stdout, stderr) => {
    if (err) {
      console.error('[agents] restart failed:', stderr);
      return res.status(500).json({ error: 'Failed to restart agent', detail: stderr.trim() });
    }
    res.json({ success: true, message: 'Agent restarting...' });
  });
});

module.exports = router;
