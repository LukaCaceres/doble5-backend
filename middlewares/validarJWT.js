const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario');

const validarJWT = async (req, res, next) => {
    const token = req.header('x-token');

    if (!token) {
        return res.status(401).json({ msg: 'No hay token en la petición' });
    }

    try {
        const { uid } = jwt.verify(token, process.env.SECRETORPRIVATEKEY);

        // Obtener el usuario autenticado
        const usuario = await Usuario.findById(uid);
        if (!usuario || !usuario.estado) {
            return res.status(401).json({ msg: 'Token no válido - usuario no existe o inactivo' });
        }

        req.usuario = usuario;
        next();
    } catch (error) {
        console.error('Error al verificar token:', error);
        res.status(401).json({ msg: 'Token no válido' });
    }
};

module.exports = {
    validarJWT
};
