const Venta = require('../models/venta');
const Carrito = require('../models/carrito');


const obtenerTodasLasVentas = async (req, res) => {
    try {
        const ventas = await Venta.find()
            .populate('usuario', 'nombre correo') // Poblamos los datos del usuario que hizo la compra
            .populate('productos.producto', 'nombre precio') // Poblamos los datos de los productos vendidos
            .sort({ fechaCreacion: -1 }); // Ordenamos las ventas por fecha de creación, la más reciente primero

        res.json({
            msg: 'Historial de todas las ventas',
            ventas
        });
    } catch (error) {
        console.error('Error al obtener todas las ventas:', error);
        res.status(500).json({ msg: 'Error al obtener el historial de ventas' });
    }
};

// Crear una nueva venta a partir del carrito del usuario autenticado
const ventaPOST = async (req, res) => {
    const usuarioId = req.usuario._id;

    try {
        // Obtener el carrito del usuario
        const carrito = await Carrito.findOne({ usuario: usuarioId }).populate('productos.producto', 'nombre precio');
        if (!carrito || carrito.productos.length === 0) {
            return res.status(400).json({ msg: 'El carrito está vacío. No se puede crear una venta sin productos.' });
        }

        // Calcular el total de la venta basado en los productos del carrito
        let total = 0;
        const productosVenta = carrito.productos.map(item => {
            const { producto, cantidad } = item;
            total += producto.precio * cantidad;
            return {
                producto: producto._id,  // Solo almacenamos la referencia al producto
                cantidad
            };
        });

        // Crear la venta
        const nuevaVenta = new Venta({
            usuario: usuarioId,
            productos: productosVenta,
            total,  // Total calculado
        });

        // Guardar la venta
        await nuevaVenta.save();

        // Limpiar el carrito después de crear la venta
        carrito.productos = [];
        await carrito.save();

        res.status(201).json({
            msg: 'Venta creada correctamente',
            venta: nuevaVenta
        });
    } catch (error) {
        console.error('Error al crear la venta:', error);
        res.status(500).json({ msg: 'Error al crear la venta' });
    }
};

// Obtener todas las ventas de un usuario autenticado 
const ventaGET = async (req, res) => {
    const usuarioId = req.usuario._id;

    try {
        const ventas = await Venta.find({ usuario: usuarioId }).populate('productos.producto', 'nombre precio');
        if (!ventas || ventas.length === 0) {
            return res.status(404).json({ msg: 'No tienes ventas registradas.' });
        }

        res.json({
            msg: 'Ventas obtenidas correctamente',
            ventas
        });
    } catch (error) {
        console.error('Error al obtener las ventas:', error);
        res.status(500).json({ msg: 'Error al obtener las ventas' });
    }
};

// Subir comprobante y actualizar el estado del pago 
const subirComprobante = async (req, res) => {
    const { ventaId, numeroComprobante } = req.body;
    const usuarioId = req.usuario._id;

    try {
        const venta = await Venta.findOne({ _id: ventaId, usuario: usuarioId });

        if (!venta) {
            return res.status(404).json({ msg: 'Venta no encontrada.' });
        }

        // Verificar si ya tiene un comprobante
        if (venta.comprobante) {
            return res.status(400).json({ msg: 'El comprobante ya fue subido para esta venta.' });
        }

        // Actualizar el comprobante
        venta.comprobante = true;
        venta.numeroComprobante = numeroComprobante;

        // Guardar la venta con el comprobante actualizado
        await venta.save();

        res.json({
            msg: 'Comprobante subido correctamente',
            venta
        });
    } catch (error) {
        console.error('Error al subir comprobante:', error);
        res.status(500).json({ msg: 'Error al subir el comprobante' });
    }
};

// Verificar el pago (solo administrador)
const verificarPago = async (req, res) => {
    const { ventaId } = req.params;

    try {
        const venta = await Venta.findById(ventaId);
        if (!venta) {
            return res.status(404).json({ msg: 'Venta no encontrada.' });
        }

        // Verificar si ya tiene el estado de pago verificado o rechazado
        if (venta.estadoPago === 'verificado') {
            return res.status(400).json({ msg: 'El pago ya ha sido verificado.' });
        }

        // Actualizar el estado de pago a "verificado"
        venta.estadoPago = 'verificado';
        venta.fechaFinalizacion = Date.now();
        venta.finalizada = true;

        await venta.save();

        res.json({
            msg: 'Pago verificado correctamente',
            venta
        });
    } catch (error) {
        console.error('Error al verificar el pago:', error);
        res.status(500).json({ msg: 'Error al verificar el pago' });
    }
};

// Eliminar una venta - Solo para pruebas o en caso de errores
const ventaDELETE = async (req, res) => {
    const { ventaId } = req.params;
    
    try {
        const ventaEliminada = await Venta.findByIdAndDelete(ventaId);

        if (!ventaEliminada) {
            return res.status(404).json({ msg: 'Venta no encontrada.' });
        }

        res.json({
            msg: 'Venta eliminada correctamente',
            venta: ventaEliminada
        });
    } catch (error) {
        console.error('Error al eliminar la venta:', error);
        res.status(500).json({ msg: 'Error al eliminar la venta' });
    }
};

module.exports = {
    obtenerTodasLasVentas,
    ventaPOST,
    ventaGET,
    subirComprobante,
    verificarPago,
    ventaDELETE
};
