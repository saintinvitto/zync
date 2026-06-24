const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/authMiddleware');
const logController = require('../controllers/logController');

router.use(autenticar);

router.get('/', logController.listar);

module.exports = router;
