const express = require('express');
const router = express.Router();
const { validarJWT, esAdminRol } = require('../middlewares/auth');
const {
  obtenerOrdenes,
  obtenerOrdenPorId
} = require('../controllers/orden');

router.get('/', validarJWT, esAdminRol, obtenerOrdenes);
router.get('/:id', validarJWT, esAdminRol, obtenerOrdenPorId);

module.exports = router;
