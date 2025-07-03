const { Router } = require('express');
const { check } = require('express-validator');
const { login, recuperarPassword, cambiarPassword } = require('../controllers/auth');
const { validarCampos } = require('../middlewares/validarCampos');

const router = Router();

// Autenticación de usuario (login)
router.post('/login', [
    check('correo', 'El correo no es válido').isEmail(),
    check('password', 'El password es obligatorio').not().isEmpty(),
    validarCampos
], login);

// Recuperar contraseña (solicitar token)
router.post('/recuperar-password', [
    check('correo', 'El correo no es válido').isEmail(),
    validarCampos
], recuperarPassword);

// Cambiar contraseña (con token)
router.post('/cambiar-password', [
    check('token', 'El token es obligatorio').not().isEmpty(),
    check('password', 'El password debe tener al menos 6 caracteres').isLength({ min: 6 }),
    validarCampos
], cambiarPassword);

module.exports = router;
