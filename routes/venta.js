const { Router } = require('express');
const { check } = require('express-validator');
const { ventaPOST, ventaGET, subirComprobante, verificarPago, ventaDELETE, obtenerTodasLasVentas } = require('../controllers/venta');
const { validarJWT, esAdminRol } = require('../middlewares/auth');
const { validarCampos } = require('../middlewares/validarCampos');

const router = Router();

// Ruta para que los administradores obtengan todas las ventas
router.get('/historial', [validarJWT, esAdminRol], obtenerTodasLasVentas);

// Crear una venta (solo usuarios autenticados) - se toma desde el carrito del usuario
router.post('/', validarJWT, ventaPOST);

// Obtener las ventas del usuario autenticado 
router.get('/', validarJWT, ventaGET);

// Subir comprobante para una venta (solo usuarios autenticados) 
router.put('/subir-comprobante', [
    validarJWT,
    check('ventaId', 'El ID de la venta no es válido').isMongoId(),
    check('numeroComprobante', 'El número de comprobante es obligatorio').not().isEmpty(),
    validarCampos
], subirComprobante);

// Verificar el pago (solo administrador) (PUT)
router.put('/verificar-pago/:ventaId', [
    validarJWT,
    esAdminRol,
    check('ventaId', 'El ID de la venta no es válido').isMongoId(),
    validarCampos
], verificarPago);

// Eliminar una venta (solo para pruebas o administradores) 
router.delete('/:ventaId', [
    validarJWT,
    esAdminRol,
    check('ventaId', 'El ID de la venta no es válido').isMongoId(),
    validarCampos
], ventaDELETE);

module.exports = router;
