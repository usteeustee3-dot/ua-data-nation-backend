const router = require('express').Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

router.get('/stats', auth, admin, async (req, res) => {
  try {
    const users = await User.find();
    const txs = await Transaction.find();
    const totalBalance = users.reduce((acc, user) => acc + user.walletBalance, 0);
    res.json({ users: users.length, transactions: txs.length, totalBalance });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;