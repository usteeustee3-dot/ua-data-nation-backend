const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendVerificationCode } = require('../services/emailService');

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    let accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    let bankName = "UA Wallet";

    // Try to generate a real Wema Bank account from Paystack
    try {
      const customerRes = await axios.post('https://api.paystack.co/customer', {
        email: email,
        first_name: fullName.split(' ')[0],
        last_name: fullName.split(' ')[1] || 'User',
        phone: phone
      }, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` }
      });
      const customerCode = customerRes.data.data.customer_code;

      const virtualAccountRes = await axios.post('https://api.paystack.co/dedicated_account', {
        customer: customerCode,
        preferred_bank: 'wema-bank'
      }, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` }
      });

      accountNumber = virtualAccountRes.data.data.account_number;
      bankName = virtualAccountRes.data.data.bank.name;
    } catch (paystackError) {
      console.log("Paystack Virtual Account failed (using random). Error:", paystackError.response?.data?.message || paystackError.message);
    }

    const user = await User.create({ 
      fullName, email, phone, password: hashed, 
      verificationCode, accountNumber, bankName 
    });

    try {
      await sendVerificationCode(email, verificationCode);
    } catch (emailErr) {
      console.error("Email failed.");
    }

    res.status(201).json({ 
      message: 'Registration successful. Check your email for the code.',
      email: user.email 
    });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

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
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(400).json({ message: 'Please verify your email first' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    res.json({ 
      token: signToken(user), 
      user: { 
        id: user._id, fullName: user.fullName, email: user.email, 
        phone: user.phone, walletBalance: user.walletBalance,
        role: user.role, accountNumber: user.accountNumber, bankName: user.bankName
      } 
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

module.exports = router;