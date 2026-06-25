const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/authMiddleware');
const webhookController = require('../controllers/webhookController');

router.use(autenticar);

router.get('/', webhookController.listar);
router.post('/', webhookController.criar);
router.patch('/:id', webhookController.atualizar);
router.delete('/:id', webhookController.remover);
router.post('/:id/testar', webhookController.testar);

module.exports = router;
