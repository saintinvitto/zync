const express = require('express');
const router = express.Router();
const { webhookLimiter } = require('../middleware/rateLimiter');
const verificarTokenWebhook = require('../middleware/webhookAuthMiddleware');
const syncpayWebhookController = require('../controllers/syncpayWebhookController');

router.post('/', webhookLimiter, verificarTokenWebhook('SYNCPAY_WEBHOOK_TOKEN'), syncpayWebhookController.receber);

module.exports = router;
