const express = require('express');
const multer = require('multer');
const router = express.Router({ mergeParams: true });
const autenticar = require('../middleware/authMiddleware');
const whatsappController = require('../controllers/whatsappController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

router.use(autenticar);

router.post('/enviar', whatsappController.enviarManual);
router.post('/enviar-midia', upload.single('arquivo'), whatsappController.enviarMidiaManual);
router.get('/midia/:mensagemId', whatsappController.baixarMidia);

module.exports = router;
