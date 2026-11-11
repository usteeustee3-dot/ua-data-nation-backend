const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

router.post('/fund', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ message: 'Minimum ₦100' });
    const user = await User.findById(req.user.id);
    user.walletBalance += Number(amount);
    await user.save();
    await Transaction.create({ user: user._id, type: 'wallet_fund', amount, status: 'success', reference: `FUND-${Date.now()}` });
    res.json({ message: 'Wallet funded', balance: user.walletBalance });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/balance', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ balance: user.walletBalance });
});

router.get('/transactions', auth, async (req, res) => {
  const list = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(30);
  res.json(list);
});

module.exports = router;