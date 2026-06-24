const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/authMiddleware');
const notificacaoController = require('../controllers/notificacaoController');

router.use(autenticar);
router.get('/', notificacaoController.listar);
router.get('/contagem', notificacaoController.contarNaoLidas);
router.patch('/lida-todas', notificacaoController.marcarTodasLidas);
router.patch('/:id/lida', notificacaoController.marcarLida);

module.exports = router;
