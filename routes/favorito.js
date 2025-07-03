const { Router } = require('express');
const { check } = require('express-validator');
const { favoritoGET, favoritoPOST, favoritoPUT, favoritoDELETE } = require('../controllers/favorito');
const { validarCampos } = require('../middlewares/validarCampos');
const { validarJWT } = require('../middlewares/auth');
const { existeProductoPorId } = require('../helpers/db-validators');

const router = Router();

// Obtener la lista de favoritos del usuario autenticado (GET)
router.get('/', validarJWT, favoritoGET);

// Agregar un producto a la lista de favoritos (POST)
router.post('/agregar', [
    validarJWT,
    check('productoId', 'El ID del producto no es válido').isMongoId(),
    check('productoId').custom(existeProductoPorId),
    validarCampos
], favoritoPOST);

// Eliminar un producto de la lista de favoritos (PUT)
router.put('/eliminar', [
    validarJWT,
    check('productoId', 'El ID del producto no es válido').isMongoId(),
    check('productoId').custom(existeProductoPorId),
    validarCampos
], favoritoPUT);

// Limpiar toda la lista de favoritos (DELETE)
router.delete('/limpiar', validarJWT, favoritoDELETE);

module.exports = router;
