const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendVerificationCode } = require('../services/emailService');

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// REGISTER ROUTE (Updated for Email Verification)
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const user = await User.create({ 
      fullName, 
      email, 
      phone, 
      password: hashed, 
      verificationCode 
    });

    // Send the email
    await sendVerificationCode(email, verificationCode);

    res.status(201).json({ 
      message: 'Registration successful. Check your email for the code.',
      email: user.email 
    });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

// VERIFY ROUTE (New)
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.verificationCode !== code) return res.status(400).json({ message: 'Invalid code' });

    user.isVerified = true;
    user.verificationCode = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully. You can now login.' });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

// LOGIN ROUTE (Updated to block unverified users)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    if (!user.isVerified) return res.status(400).json({ message: 'Please verify your email first' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    res.json({ token: signToken(user), user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, walletBalance: user.walletBalance } });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

module.exports = router;