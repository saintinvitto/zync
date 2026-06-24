const express = require('express');
const router = express.Router({ mergeParams: true });
const autenticar = require('../middleware/authMiddleware');
const mensagemController = require('../controllers/mensagemController');

router.use(autenticar);

router.get('/', mensagemController.listar);
router.post('/', mensagemController.criar);

module.exports = router;
