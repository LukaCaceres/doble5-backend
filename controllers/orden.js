const Orden = require('../models/orden');
exports.obtenerOrdenes = async (req, res) => {
    try {
        const ordenes = await Orden.find()
            .populate('usuario', 'nombre email') // Si querés ver quién hizo la orden
            .sort({ creadoEn: -1 }); // Ordenadas por fecha (recientes primero)

        res.json({ total: ordenes.length, ordenes });
    } catch (error) {
        console.error('Error al obtener órdenes:', error.message);
        res.status(500).json({ msg: 'Error al obtener las órdenes' });
    }
};

exports.obtenerOrdenPorId = async (req, res) => {
    const { id } = req.params;

    try {
        const orden = await Orden.findById(id).populate('usuario', 'nombre email');

        if (!orden) {
            return res.status(404).json({ msg: 'Orden no encontrada' });
        }

        res.json(orden);
    } catch (error) {
        console.error('Error al buscar orden:', error.message);
        res.status(500).json({ msg: 'Error al buscar la orden' });
    }
};