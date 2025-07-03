const jwt = require('jsonwebtoken');

// Generar token de recuperación de contraseña
const generarTokenRecuperacion = (uid = '') => {
    return jwt.sign({ uid }, process.env.SECRETORPRIVATEKEY, { expiresIn: '1h' });
};

// Verificar token de recuperación de contraseña
const verificarTokenRecuperacion = (token) => {
    try {
        const payload = jwt.verify(token, process.env.SECRETORPRIVATEKEY);
        return payload;
    } catch (error) {
        throw new Error('Token de recuperación inválido o expirado');
    }
};

module.exports = {
    generarTokenRecuperacion,
    verificarTokenRecuperacion
};
