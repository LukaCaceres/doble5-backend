const Carrito = require('../models/carrito');
const Producto = require('../models/producto');

// Middleware para verificar si el producto ya está en el carrito
const validarProductoEnCarrito = async (req, res, next) => {
    const { productoId, cantidad } = req.body;
    const usuarioId = req.usuario._id;

    try {
        // Buscar el carrito del usuario
        let carrito = await Carrito.findOne({ usuario: usuarioId });
        if (!carrito) {
            return next();
        }
        // Verificar si el producto ya está en el carrito
        const productoExistente = carrito.productos.find(p => p.producto.toString() === productoId);
        if (productoExistente) {
            productoExistente.cantidad += cantidad;
            await carrito.save();
            return res.json({ msg: 'Cantidad de producto actualizada en el carrito', carrito });
        }

        next();
    } catch (error) {
        console.error('Error al verificar el carrito:', error);
        return res.status(500).json({ msg: 'Error del servidor' });
    }
};

// Middleware para verificar si el producto existe
const validarProductoExiste = async (req, res, next) => {
    const { productoId } = req.body;

    try {
        const producto = await Producto.findById(productoId);
        if (!producto || !producto.activo) {
            return res.status(404).json({ msg: 'El producto no existe o no está disponible' });
        }

        // Si el producto existe, pasamos al siguiente middleware/controlador
        next();
    } catch (error) {
        console.error('Error al verificar el producto:', error);
        return res.status(500).json({ msg: 'Error del servidor' });
    }
};

module.exports = {
    validarProductoEnCarrito,
    validarProductoExiste
};
