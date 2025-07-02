const express = require('express');
const router = express.Router();
const { validarJWT } = require('../middlewares/auth');
const {
    crearPreferencia,
    procesarWebhook
} = require('../controllers/payment');

router.post('/crear_preferencia', validarJWT, crearPreferencia);
router.post('/webhook', procesarWebhook);

module.exports = router;
