const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const vtu = require('../services/vtuService');

const DATA_PLANS = {
  MTN: [{ id: 'mtn-1gb', size: '1GB', price: 300 }, { id: 'mtn-2gb', size: '2GB', price: 600 }, { id: 'mtn-5gb', size: '5GB', price: 1400 }],
  AIRTEL: [{ id: 'airtel-1gb', size: '1GB', price: 300 }, { id: 'airtel-2gb', size: '2GB', price: 600 }, { id: 'airtel-5gb', size: '5GB', price: 1400 }],
  GLO: [{ id: 'glo-1gb', size: '1GB', price: 280 }, { id: 'glo-2gb', size: '2GB', price: 550 }, { id: 'glo-5gb', size: '5GB', price: 1300 }],
  '9MOBILE': [{ id: '9mobile-1gb', size: '1GB', price: 300 }, { id: '9mobile-2gb', size: '2GB', price: 600 }]
};

router.get('/plans', (req, res) => res.json(DATA_PLANS));

router.post('/buy', auth, async (req, res) => {
  try {
    const { network, planId, phone } = req.body;
    const plans = DATA_PLANS[network];
    if (!plans) return res.status(400).json({ message: 'Invalid network' });
    const plan = plans.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ message: 'Invalid plan' });

    const user = await User.findById(req.user.id);
    if (user.walletBalance < plan.price) return res.status(400).json({ message: 'Insufficient balance' });

    const tx = await Transaction.create({ user: user._id, type: 'data', amount: plan.price, reference: `DATA-${Date.now()}`, details: { network, plan: plan.size, phone } });
    await vtu.buyData({ network, plan: planId, phone });
    
    user.walletBalance -= plan.price;
    await user.save();
    tx.status = 'success';
    await tx.save();
    res.json({ message: 'Data purchased', transaction: tx });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;