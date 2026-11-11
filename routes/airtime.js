const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const vtu = require('../services/vtuService');

router.post('/buy', auth, async (req, res) => {
  try {
    const { network, amount, phone } = req.body;
    const user = await User.findById(req.user.id);
    if (user.walletBalance < amount) return res.status(400).json({ message: 'Insufficient balance' });

    const tx = await Transaction.create({ user: user._id, type: 'airtime', amount, reference: `AIR-${Date.now()}`, details: { network, phone } });
    await vtu.buyAirtime({ network, amount, phone });

    user.walletBalance -= amount;
    await user.save();
    tx.status = 'success';
    await tx.save();
    res.json({ message: 'Airtime purchased', transaction: tx });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;