const { request, response } = require('express');
const Carrito = require('../models/carrito');

// Obtener el carrito del usuario (GET)
const carritoGET = async (req = request, res = response) => {
    const usuarioId = req.usuario._id;

    try {
        const carrito = await Carrito.findOne({ usuario: usuarioId }).populate('productos.producto', 'nombre precio imagenes');
        if (!carrito) {
            return res.status(404).json({ msg: 'El carrito no existe' });
        }

        res.json(carrito);
    } catch (error) {
        console.error('Error al obtener el carrito:', error);
        res.status(500).json({ msg: 'Error al obtener el carrito' });
    }
};

// Agregar producto al carrito (POST)
const carritoPOST = async (req = request, res = response) => {
    const { productoId, cantidad } = req.body;
    const usuarioId = req.usuario._id;

    try {
        // Obtener el carrito del usuario o crearlo si no existe
        let carrito = await Carrito.findOne({ usuario: usuarioId });
        if (!carrito) {
            carrito = new Carrito({ usuario: usuarioId, productos: [] });
        }

        // Agregar el producto al carrito
        carrito.productos.push({ producto: productoId, cantidad });

        // Guardar el carrito actualizado
        await carrito.save();
        res.json({ msg: 'Producto agregado al carrito', carrito });
    } catch (error) {
        console.error('Error al agregar producto al carrito:', error);
        res.status(500).json({ msg: 'Error al agregar producto al carrito' });
    }
};

// Actualizar cantidad de producto en el carrito (PUT)
const carritoActualizarCantidad = async (req = request, res = response) => {
    const { productoId, cantidad } = req.body;
    const usuarioId = req.usuario._id;

    try {
        const carrito = await Carrito.findOne({ usuario: usuarioId });
        if (!carrito) {
            return res.status(404).json({ msg: 'El carrito no existe' });
        }

        // Buscar el producto en el carrito
        const productoEnCarrito = carrito.productos.find(p => p.producto.toString() === productoId);
        
        if (!productoEnCarrito) {
            return res.status(404).json({ msg: 'Producto no encontrado en el carrito' });
        }

        // Actualizar la cantidad del producto
        productoEnCarrito.cantidad += cantidad;

        // Si la cantidad es menor o igual a 0, eliminar el producto del carrito
        if (productoEnCarrito.cantidad <= 0) {
            carrito.productos = carrito.productos.filter(p => p.producto.toString() !== productoId);
        }

        // Guardar el carrito actualizado
        await carrito.save();
        res.json({ msg: 'Cantidad actualizada en el carrito', carrito });
    } catch (error) {
        console.error('Error al actualizar la cantidad del producto en el carrito:', error);
        res.status(500).json({ msg: 'Error al actualizar el producto en el carrito' });
    }
};



// Eliminar producto del carrito (PUT)
const carritoPUT = async (req = request, res = response) => {
    const { productoId } = req.body;
    const usuarioId = req.usuario._id;

    try {
        // Obtener el carrito del usuario
        const carrito = await Carrito.findOne({ usuario: usuarioId });
        if (!carrito) {
            return res.status(404).json({ msg: 'El carrito no existe' });
        }

        // Filtrar el producto del carrito
        carrito.productos = carrito.productos.filter(p => p.producto.toString() !== productoId);
        
        // Guardar el carrito actualizado
        await carrito.save();

        res.json({ msg: 'Producto eliminado del carrito', carrito });
    } catch (error) {
        console.error('Error al eliminar producto del carrito:', error);
        res.status(500).json({ msg: 'Error al eliminar producto del carrito' });
    }
};

// Limpiar el carrito (DELETE)
const carritoDELETE = async (req = request, res = response) => {
    const usuarioId = req.usuario._id;

    try {
        // Vaciar el carrito del usuario
        const carrito = await Carrito.findOneAndUpdate(
            { usuario: usuarioId },
            { productos: [] },
            { new: true }
        );

        if (!carrito) {
            return res.status(404).json({ msg: 'El carrito no existe' });
        }

        res.json({ msg: 'Carrito limpiado correctamente', carrito });
    } catch (error) {
        console.error('Error al limpiar el carrito:', error);
        res.status(500).json({ msg: 'Error al limpiar el carrito' });
    }
};

module.exports = {
    carritoPOST,
    carritoGET,
    carritoPUT,
    carritoDELETE,
    carritoActualizarCantidad
};
