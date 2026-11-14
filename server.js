require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();
app.set('trust proxy', 1);
connectDB();

app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/data', require('./routes/data'));
app.use('/api/airtime', require('./routes/airtime'));
app.use('/api/exam', require('./routes/exam'));
app.use('/api/electricity', require('./routes/electricity'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/cable', require('./routes/cable'));
app.use('/api/services', require('./routes/services')); // <-- NEW ROUTE

app.get('/', (req, res) => res.json({ app: 'UA Data Nation', status: 'running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 UA Data Nation running on http://localhost:${PORT}`));