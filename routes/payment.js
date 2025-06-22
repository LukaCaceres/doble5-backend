const express = require('express');
const router = express.Router();
const { validarJWT} = require('../middlewares/auth');
const {
  crearPreferencia,
  procesarWebhook
} = require('../controllers/payment');

router.post('/crear_preferencia',crearPreferencia, validarJWT);
router.post('/webhook', procesarWebhook);

module.exports = router;
