const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const leadRoutes = require('./leadRoutes');
const mensagemRoutes = require('./mensagemRoutes');

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/leads/:leadId/mensagens', mensagemRoutes);

module.exports = router;
