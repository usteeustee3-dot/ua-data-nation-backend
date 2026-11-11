const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const vtu = require('../services/vtuService');

const EXAM_PRICES = { WAEC: 3500, NECO: 1200, JAMB: 5500, NABTEB: 1200 };
router.get('/prices', (req, res) => res.json(EXAM_PRICES));

router.post('/buy', auth, async (req, res) => {
  try {
    const { examType, quantity = 1 } = req.body;
    const total = EXAM_PRICES[examType] * quantity;
    const user = await User.findById(req.user.id);
    if (user.walletBalance < total) return res.status(400).json({ message: 'Insufficient balance' });

    const tx = await Transaction.create({ user: user._id, type: 'exam', amount: total, reference: `EXAM-${Date.now()}`, details: { examType, quantity } });
    const result = await vtu.buyExamPin({ examType, quantity });

    user.walletBalance -= total;
    await user.save();
    tx.status = 'success';
    tx.details.pins = result.pins;
    await tx.save();
    res.json({ message: 'Exam pin purchased', pins: result.pins });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;