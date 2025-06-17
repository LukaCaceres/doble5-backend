const { Router } = require('express');
const { check } = require('express-validator');
const { rolGET, rolPOST } = require('../controllers/rol');
const { validarCampos } = require('../middlewares/validarCampos');
const { validarJWT } = require('../middlewares/validarJWT');
const { esAdminRol } = require('../middlewares/auth');

const router = Router();

// Obtener roles (solo administradores)
router.get('/', [validarJWT, esAdminRol], rolGET);

// Crear un nuevo rol (solo administradores)
router.post('/', [
    validarJWT,
    esAdminRol,
    check('rol', 'El rol es obligatorio').not().isEmpty(),
    validarCampos
], rolPOST);

module.exports = router;
