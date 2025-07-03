const Favorito = require('../models/favorito');
const Producto = require('../models/producto');

// Obtener los favoritos del usuario 
const favoritoGET = async (req, res) => {
    const usuarioId = req.usuario._id;

    try {
        // Consulta con populate para obtener detalles del producto
        const favorito = await Favorito.findOne({ usuario: usuarioId }).populate('productos.producto', 'nombre precio imagenes');
        
        // Verificar si el usuario tiene una lista de favoritos
        if (!favorito) {
            return res.status(404).json({ msg: 'No tienes una lista de favoritos.' });
        }

        // Verificar si hay productos en la lista de favoritos
        if (favorito.productos.length === 0) {
            return res.status(404).json({ msg: 'No tienes productos en favoritos.' });
        }

        res.json({
            msg: 'Lista de favoritos obtenida correctamente',
            favorito
        });
    } catch (error) {
        console.error('Error al obtener los favoritos:', error);
        res.status(500).json({ msg: 'Error al obtener los favoritos' });
    }
};


const favoritoPOST = async (req, res) => {
    const { productoId } = req.body;
    const usuarioId = req.usuario._id;

    try {
        // Verificar que el producto existe y está activo
        const producto = await Producto.findById(productoId);
        if (!producto || !producto.activo) {
            return res.status(400).json({ msg: 'El producto no existe o no está disponible.' });
        }

        // Obtener o crear el listado de favoritos del usuario
        let favorito = await Favorito.findOne({ usuario: usuarioId });
        if (!favorito) {
            // Crear una nueva lista de favoritos si no existe
            favorito = new Favorito({ usuario: usuarioId, productos: [] });
        }

        // Verificar si el producto ya está en favoritos
        const productoExistente = favorito.productos.find(p => p.producto.toString() === productoId);
        if (productoExistente) {
            return res.status(400).json({ msg: 'El producto ya está en tu lista de favoritos.' });
        }

        // Agregar el producto a la lista de favoritos
        favorito.productos.push({ producto: productoId });
        await favorito.save();

        res.json({
            msg: 'Producto agregado a favoritos',
            favorito
        });
    } catch (error) {
        console.error('Error al agregar producto a favoritos:', error);
        res.status(500).json({ msg: 'Error al agregar producto a favoritos' });
    }
};


// Eliminar un producto de favoritos 
const favoritoPUT = async (req, res) => {
    const { productoId } = req.body;
    const usuarioId = req.usuario._id;

    try {
        // Obtener el listado de favoritos del usuario
        const favorito = await Favorito.findOne({ usuario: usuarioId });
        if (!favorito) {
            return res.status(404).json({ msg: 'No tienes lista de favoritos.' });
        }

        // Filtrar el producto de la lista de favoritos
        favorito.productos = favorito.productos.filter(p => p.producto.toString() !== productoId);

        await favorito.save();

        res.json({
            msg: 'Producto eliminado de favoritos',
            favorito
        });
    } catch (error) {
        console.error('Error al eliminar producto de favoritos:', error);
        res.status(500).json({ msg: 'Error al eliminar producto de favoritos' });
    }
};

// Limpiar toda la lista de favoritos 
const favoritoDELETE = async (req, res) => {
    const usuarioId = req.usuario._id;

    try {
        // Limpiar los productos de la lista de favoritos
        const favorito = await Favorito.findOneAndUpdate(
            { usuario: usuarioId },
            { productos: [] },
            { new: true }
        );

        if (!favorito) {
            return res.status(404).json({ msg: 'No tienes lista de favoritos.' });
        }

        res.json({
            msg: 'Lista de favoritos limpiada correctamente',
            favorito
        });
    } catch (error) {
        console.error('Error al limpiar favoritos:', error);
        res.status(500).json({ msg: 'Error al limpiar favoritos' });
    }
};

module.exports = {
    favoritoGET,
    favoritoPOST,
    favoritoPUT,
    favoritoDELETE
};
