const bcryptjs = require('bcryptjs');
const { request, response } = require('express');
const Usuario = require('../models/usuario');
const generarJWT = require('../helpers/generarJWT');
const { generarTokenRecuperacion, verificarTokenRecuperacion } = require('../helpers/generarTokenRecuperacion');
const nodemailer = require('nodemailer');

// Autenticación de usuario (login)
const login = async (req = request, res = response) => {
    const { correo, password } = req.body;

    try {
        // Verificar si el usuario existe en la base de datos
        const usuario = await Usuario.findOne({ correo });
        if (!usuario) {
            return res.status(400).json({ msg: 'Correo o contraseña incorrectos' });
        }

        // Verificar si el usuario está activo
        if (!usuario.estado) {
            return res.status(400).json({ msg: 'Cuenta inactiva' });
        }

        // Verificar la contraseña
        const validPassword = bcryptjs.compareSync(password, usuario.password);
        if (!validPassword) {
            return res.status(400).json({ msg: 'Correo o contraseña incorrectos' });
        }

        // Generar el token JWT
        const token = await generarJWT(usuario.id);

        res.json({
            msg: 'Login correcto',
            usuario,
            token
        });
    } catch (error) {
        console.error('Error al hacer login:', error);
        res.status(500).json({ msg: 'Error en el servidor' });
    }
};

// Recuperar contraseña (solicitar token de recuperación)
const recuperarPassword = async (req = request, res = response) => {
    const { correo } = req.body;

    try {
        const usuario = await Usuario.findOne({ correo });
        if (!usuario) {
            return res.status(400).json({ msg: 'El correo no está registrado' });
        }

        // Generar el token de recuperación
        const token = generarTokenRecuperacion(usuario.id);

        // Enviar el token de recuperación por correo electrónico
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: usuario.correo,
            subject: 'Recuperación de contraseña',
            text: `Sigue este enlace para recuperar tu contraseña: ${process.env.FRONTEND_URL}/reset-password/${token}`
        };

        await transporter.sendMail(mailOptions);

        res.json({
            msg: 'Correo de recuperación enviado correctamente',
            token
        });
    } catch (error) {
        console.error('Error al enviar correo de recuperación:', error);
        res.status(500).json({ msg: 'Error al enviar el correo' });
    }
};

// Cambiar contraseña (con el token de recuperación)
const cambiarPassword = async (req = request, res = response) => {
    const { token, password } = req.body;

    try {
        const { uid } = verificarTokenRecuperacion(token);

        // Verificar si el usuario existe
        const usuario = await Usuario.findById(uid);
        if (!usuario) {
            return res.status(400).json({ msg: 'Usuario no encontrado' });
        }

        // Encriptar la nueva contraseña
        const salt = bcryptjs.genSaltSync();
        usuario.password = bcryptjs.hashSync(password, salt);

        // Guardar cambios
        await usuario.save();

        res.json({
            msg: 'Contraseña cambiada correctamente'
        });
    } catch (error) {
        console.error('Error al cambiar la contraseña:', error);
        res.status(500).json({ msg: 'Error al cambiar la contraseña' });
    }
};

module.exports = {
    login,
    recuperarPassword,
    cambiarPassword
};
