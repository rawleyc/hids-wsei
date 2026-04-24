require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/stats',  require('./routes/stats'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/alerts', require('./routes/analyze'));
app.use('/api/rules',  require('./routes/rules'));
app.use('/api/health', require('./routes/health'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`HIDS API running on :${PORT}`));
