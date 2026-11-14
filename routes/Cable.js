const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const CABLE_PLANS = {
  DSTV: [
    { id: 'dstv-padi', name: 'DStv Padi', price: 2150 },
    { id: 'dstv-yanga', name: 'DStv Yanga', price: 2950 },
    { id: 'dstv-confam', name: 'DStv Confam', price: 5300 },
    { id: 'dstv-compact', name: 'DStv Compact', price: 9000 }
  ],
  GOTV: [
    { id: 'gotv-smallie', name: 'GOtv Smallie', price: 1100 },
    { id: 'gotv-jinja', name: 'GOtv Jinja', price: 2250 },
    { id: 'gotv-jolli', name: 'GOtv Jolli', price: 3300 },
    { id: 'gotv-max', name: 'GOtv Max', price: 4850 }
  ]
};

router.get('/plans', (req, res) => res.json(CABLE_PLANS));

router.post('/pay', auth, async (req, res) => {
  try {
    const { provider, planId, smartcard } = req.body;
    const plans = CABLE_PLANS[provider];
    if (!plans) return res.status(400).json({ message: 'Invalid provider' });
    
    const plan = plans.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ message: 'Invalid plan' });
    if (!smartcard || smartcard.length < 10) return res.status(400).json({ message: 'Invalid smartcard number' });

    const user = await User.findById(req.user.id);
    if (user.walletBalance < plan.price) return res.status(400).json({ message: 'Insufficient balance' });

    const tx = await Transaction.create({ 
      user: user._id, 
      type: 'cable', 
      amount: plan.price, 
      reference: `CABLE-${Date.now()}`, 
      details: { provider, plan: plan.name, smartcard } 
    });

    // Mock delay to simulate network request
    await new Promise(r => setTimeout(r, 1000));
    
    user.walletBalance -= plan.price;
    await user.save();
    
    tx.status = 'success';
    await tx.save();
    
    res.json({ message: 'Cable TV subscription successful', transaction: tx });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;