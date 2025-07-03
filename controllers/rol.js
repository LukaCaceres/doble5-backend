const Rol = require('../models/rol');

// Obtener todos los roles
const rolGET = async (req, res) => {
    const roles = await Rol.find();
    res.json({
        msg: 'Roles obtenidos correctamente',
        roles
    });
};

// Crear un nuevo rol
const rolPOST = async (req, res) => {
    const { rol } = req.body;
    const nuevoRol = new Rol({ rol });

    await nuevoRol.save();
    res.status(201).json({
        msg: 'Rol creado correctamente',
        rol: nuevoRol
    });
};

module.exports = {
    rolGET,
    rolPOST
};
