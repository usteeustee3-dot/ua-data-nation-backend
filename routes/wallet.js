const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const paystack = require('../services/paystackService');

router.post('/fund', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ message: 'Minimum ₦100' });
    
    const user = await User.findById(req.user.id);
    const reference = `FUND-${Date.now()}`;

    await Transaction.create({ user: user._id, type: 'wallet_fund', amount, status: 'pending', reference });
    
    const authUrl = await paystack.initializePayment(user.email, amount, reference);
    
    res.json({ url: authUrl });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/verify-payment', auth, async (req, res) => {
  try {
    const { reference } = req.query;
    const tx = await Transaction.findOne({ reference });

    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    if (tx.status === 'success') return res.json({ message: 'Already verified' });

    const isSuccess = await paystack.verifyPayment(reference);

    if (isSuccess) {
      const user = await User.findById(tx.user);
      user.walletBalance += tx.amount;
      await user.save();
      tx.status = 'success';
      await tx.save();
      res.json({ message: 'Wallet funded', balance: user.walletBalance });
    } else {
      res.status(400).json({ message: 'Payment failed' });
    }
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