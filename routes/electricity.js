const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const vtu = require('../services/vtuService');

const DISCOS = ['IKEDC', 'EKEDC', 'AEDC', 'PHED', 'KEDCO', 'IBEDC', 'EEDC'];
router.get('/discos', (req, res) => res.json(DISCOS));

router.post('/pay', auth, async (req, res) => {
  try {
    const { disco, meterNumber, meterType, amount } = req.body;
    const user = await User.findById(req.user.id);
    if (user.walletBalance < amount) return res.status(400).json({ message: 'Insufficient balance' });

    const tx = await Transaction.create({ user: user._id, type: 'electricity', amount, reference: `ELEC-${Date.now()}`, details: { disco, meterNumber, meterType } });
    const result = await vtu.payElectricity({ disco, meterNumber, amount });

    user.walletBalance -= amount;
    await user.save();
    tx.status = 'success';
    tx.details.token = result.token;
    await tx.save();
    res.json({ message: 'Electricity paid', token: result.token });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;