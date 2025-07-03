const { Router } = require('express');
const { check } = require('express-validator');
const { carritoGET, carritoPOST, carritoPUT, carritoDELETE, carritoActualizarCantidad } = require('../controllers/carrito');
const { validarCampos } = require('../middlewares/validarCampos');
const { validarJWT } = require('../middlewares/auth');
const { existeProductoPorId } = require('../helpers/db-validators');
const { validarProductoExiste, validarProductoEnCarrito } = require('../middlewares/validarCarrito')

const router = Router();


router.get('/', validarJWT, carritoGET);

router.post('/agregar', [
    validarJWT,
    check('productoId', 'El ID del producto no es válido').isMongoId(),
    check('productoId').custom(existeProductoPorId),
    check('cantidad', 'La cantidad debe ser mayor a 0').isInt({ min: 1 }),
    validarCampos,
    validarProductoExiste,
    validarProductoEnCarrito
], carritoPOST);

router.put('/cantidad', [
    validarJWT,
    check('productoId', 'El ID del producto no es válido').isMongoId(),
    check('productoId').custom(existeProductoPorId),
    check('cantidad', 'La cantidad es obligatoria y debe ser un número').isInt(),
    validarCampos,
    validarProductoExiste,
    validarProductoEnCarrito
], carritoActualizarCantidad);


router.put('/eliminar', [
    validarJWT,
    check('productoId', 'El ID del producto no es válido').isMongoId(),
    validarCampos
], carritoPUT);


router.delete('/limpiar', validarJWT, carritoDELETE);

module.exports = router;
