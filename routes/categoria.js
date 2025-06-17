const { Router } = require('express');
const { check } = require('express-validator');
const { categoriaGET, categoriaPOST, categoriaPUT, categoriaDELETE } = require('../controllers/categoria');
const { validarJWT } = require('../middlewares/validarJWT');
const { esAdminRol } = require('../middlewares/auth');
const { validarCampos } = require('../middlewares/validarCampos');
const { existeCategoriaPorId } = require('../helpers/db-validators');

const router = Router();

// Obtener categorías (abierto a todos los usuarios)
router.get('/', categoriaGET);

// Crear una nueva categoría (solo administradores)
router.post('/', [
    validarJWT,
    esAdminRol,
    check('categoria', 'La categoría es obligatoria').not().isEmpty(),
    validarCampos
], categoriaPOST);

// Actualizar una categoría (solo administradores)
router.put('/:id', [
    validarJWT,
    esAdminRol,
    check('id', 'No es un ID válido').isMongoId(), // Verificar que el ID es válido
    check('id').custom(existeCategoriaPorId), // Validar que la categoría existe
    check('categoria', 'La categoría es obligatoria').not().isEmpty(),
    validarCampos
], categoriaPUT);

// Eliminar una categoría (solo administradores)
router.delete('/:id', [
    validarJWT,
    esAdminRol,
    check('id', 'No es un ID válido').isMongoId(), // Verificar que el ID es válido
    check('id').custom(existeCategoriaPorId), // Validar que la categoría existe
    validarCampos
], categoriaDELETE);

module.exports = router;
