// routes/pagoRoutes.js
const express = require('express');
const router = express.Router();
const {
  crearPreferencia,
  procesarWebhook
} = require('../controllers/payment');

router.post('/crear_preferencia', crearPreferencia);
router.post('/webhook', procesarWebhook);

module.exports = router;
