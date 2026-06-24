const express = require('express');
const router = express.Router();
const { webhookLimiter } = require('../middleware/rateLimiter');
const syncpayWebhookController = require('../controllers/syncpayWebhookController');

router.post('/', webhookLimiter, syncpayWebhookController.receber);

module.exports = router;
