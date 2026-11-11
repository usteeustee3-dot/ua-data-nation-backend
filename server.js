require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();
connectDB();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/data', require('./routes/data'));
app.use('/api/airtime', require('./routes/airtime'));
app.use('/api/exam', require('./routes/exam'));
app.use('/api/electricity', require('./routes/electricity'));

app.get('/', (req, res) => res.json({ app: 'UA Data Nation', status: 'running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 UA Data Nation running on http://localhost:${PORT}`));