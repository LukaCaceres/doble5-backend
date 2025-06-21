// routes/pagoRoutes.js
const express = require('express');
const router = express.Router();
const { validarJWT, esAdminRol } = require('../middlewares/auth');
const {
  crearPreferencia,
  procesarWebhook
} = require('../controllers/payment');

router.post('/crear_preferencia',crearPreferencia, validarJWT);
router.post('/webhook', procesarWebhook);
router.get('/', validarJWT, esAdminRol, obtenerOrdenes);
router.get('/:id', validarJWT, esAdminRol, obtenerOrdenPorId);


module.exports = router;
