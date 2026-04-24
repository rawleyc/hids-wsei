const express = require('express');
const db      = require('../db');
const router  = express.Router();

router.post('/:id/analyze', async (req, res) => {
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      explanation:
        '[AI explanation unavailable: GEMINI_API_KEY is not set. ' +
        'Add it to api/.env to enable AI-powered alert analysis.]',
    });
  }

  const prompt = `You are a cybersecurity analyst reviewing a HIDS alert.
Provide a concise explanation (3-5 sentences) covering:
1. What this alert means
2. Why it is significant
3. Recommended immediate action

Alert:
- Rule: ${alert.rule}
- Severity: ${alert.severity}
- Triggered: ${alert.timestamp}
- User: ${alert.user || 'N/A'}
- Source IP: ${alert.sourceIP || 'N/A'}
- MITRE ATT&CK: ${alert.ttpTag || 'N/A'}
- Node: ${alert.nodeId}`.trim();

  try {
    const { GoogleGenAI } = require('@google/genai');
    const genai    = new GoogleGenAI({ apiKey });
    const response = await genai.models.generateContent({
      model:    'gemini-2.0-flash',
      contents: prompt,
    });
    res.json({ explanation: response.text });
  } catch (err) {
    console.error('[analyze] Gemini error:', err.message);
    res.json({ explanation: `[AI analysis temporarily unavailable: ${err.message}]` });
  }
});

module.exports = router;
