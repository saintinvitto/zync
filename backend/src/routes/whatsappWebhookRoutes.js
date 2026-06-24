const express = require('express');
const router = express.Router({ mergeParams: true });
const { webhookLimiter } = require('../middleware/rateLimiter');
const verificarTokenWebhook = require('../middleware/webhookAuthMiddleware');
const whatsappController = require('../controllers/whatsappController');

router.post('/', webhookLimiter, verificarTokenWebhook('WHATSAPP_WEBHOOK_TOKEN'), whatsappController.receberMensagem);

module.exports = router;
