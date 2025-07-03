const { validationResult } = require('express-validator');

const validarCampos = (req, res, next) => {
    // Si la solicitud es preflight OPTIONS, no validamos los campos
    if (req.method === 'OPTIONS') {
        return next();
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    next();
};

module.exports = {
    validarCampos
};
