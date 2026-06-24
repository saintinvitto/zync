const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/authMiddleware');
const planoController = require('../controllers/planoController');

router.use(autenticar);
router.get('/', planoController.listar);

module.exports = router;
