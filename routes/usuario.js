const { Router } = require('express');
const { check } = require('express-validator');
const { usuarioPOST, usuariosGET, usuarioGET, usuarioPUT, usuarioDELETE } = require('../controllers/usuario');
const { validarCampos } = require('../middlewares/validarCampos');
const { validarJWT, esAdminRol } = require('../middlewares/auth');
const { existeUsuarioPorId, emailExiste } = require('../helpers/db-validators');

const router = Router();

// Crear un nuevo usuario (registro)
router.post('/', [
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('correo', 'El correo no es válido').isEmail(),
    check('correo').custom(emailExiste),
    check('password', 'El password debe tener al menos 6 caracteres').isLength({ min: 6 }),
    validarCampos
], usuarioPOST);

// Obtener todos los usuarios (Solo admin)
router.get('/', [
    validarJWT,
    esAdminRol
], usuariosGET);

// Obtener un usuario por ID (Solo admin)
router.get('/:id', [
    validarJWT,
    esAdminRol,
    check('id', 'No es un ID válido').isMongoId(),
    check('id').custom(existeUsuarioPorId),
    validarCampos
], usuarioGET);

// Actualizar un usuario (Solo admin)
router.put('/:id', [
    validarJWT,
    esAdminRol,
    check('id', 'No es un ID válido').isMongoId(),
    check('id').custom(existeUsuarioPorId),
    validarCampos
], usuarioPUT);

// Eliminar un usuario (Solo admin)
router.delete('/:id', [
    validarJWT,
    esAdminRol,
    check('id', 'No es un ID válido').isMongoId(),
    check('id').custom(existeUsuarioPorId),
    validarCampos
], usuarioDELETE);

module.exports = router;
