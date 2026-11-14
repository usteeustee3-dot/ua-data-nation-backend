const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 1. CASH AIRTIME (Convert Airtime to Wallet)
router.post('/cash-airtime', auth, async (req, res) => {
  try {
    const { network, amount } = req.body;
    if (!amount || amount < 500) return res.status(400).json({ message: 'Minimum conversion is ₦500' });
    
    const user = await User.findById(req.user.id);
    // We give 80% of the airtime value as cash
    const cashValue = amount * 0.8; 

    const tx = await Transaction.create({ 
      user: user._id, type: 'wallet_fund', amount: cashValue, status: 'success', 
      reference: `CASH-${Date.now()}`, details: { method: 'Airtime Conversion', network, originalAmount: amount } 
    });

    user.walletBalance += cashValue;
    await user.save();
    res.json({ message: `Successfully converted ₦${amount} airtime to ₦${cashValue} cash.`, transaction: tx });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// 2. DATA CARD (Buy Data for someone else)
router.post('/data-card', auth, async (req, res) => {
  try {
    const { network, plan, phone } = req.body;
    const PRICES = { '1GB': 300, '2GB': 600, '5GB': 1400 };
    const price = PRICES[plan];
    if (!price) return res.status(400).json({ message: 'Invalid plan' });

    const user = await User.findById(req.user.id);
    if (user.walletBalance < price) return res.status(400).json({ message: 'Insufficient balance' });

    const tx = await Transaction.create({ 
      user: user._id, type: 'data', amount: price, status: 'success', 
      reference: `DCARD-${Date.now()}`, details: { network, plan, phone, type: 'Data Card' } 
    });

    user.walletBalance -= price;
    await user.save();
    res.json({ message: 'Data Card generated successfully!', transaction: tx });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// 3. RECHARGE CARD (Generate PINs)
router.post('/recharge-card', auth, async (req, res) => {
  try {
    const { network, amount } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ message: 'Minimum is ₦100' });

    const user = await User.findById(req.user.id);
    if (user.walletBalance < amount) return res.status(400).json({ message: 'Insufficient balance' });

    // Generate a mock 12-digit PIN
    const pin = Math.floor(100000000000 + Math.random() * 900000000000).toString();

    const tx = await Transaction.create({ 
      user: user._id, type: 'airtime', amount: amount, status: 'success', 
      reference: `PIN-${Date.now()}`, details: { network, amount, pin, type: 'Recharge Card' } 
    });

    user.walletBalance -= amount;
    await user.save();
    res.json({ message: 'Recharge Card generated successfully!', pin, transaction: tx });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// 4. EARN (Referral Bonus)
router.post('/earn', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    // Mock referral bonus of ₦500
    const bonus = 500;

    const tx = await Transaction.create({ 
      user: user._id, type: 'wallet_fund', amount: bonus, status: 'success', 
      reference: `EARN-${Date.now()}`, details: { method: 'Referral Bonus' } 
    });

    user.walletBalance += bonus;
    await user.save();
    res.json({ message: 'Referral bonus claimed!', transaction: tx });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;