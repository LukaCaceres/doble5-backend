const mercadopago = require('../config/mercadoPago');
const Orden = require('../models/orden');
const Carrito = require('../models/carrito');

const preferencias = mercadopago.preferences;

exports.crearPreferencia = async (req, res) => {
    try {
        if (!req.usuario) return res.status(401).json({ error: 'No autorizado' });

        const idUsuario = req.usuario._id;
        const emailComprador = req.usuario.email;

        const carrito = await Carrito.findOne({ usuario: idUsuario }).populate('productos.producto');

        if (!carrito || carrito.productos.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío.' });
        }

        const items = carrito.productos.map(item => ({
            title: item.producto.nombre,
            quantity: item.cantidad,
            unit_price: item.producto.precio
        }));

        const preferencia = await preferencias.create({
            body: {
                items,
                payer: { email: emailComprador },
                back_urls: {
                    success: `${process.env.FRONTEND_URL}/success`,
                    failure: `${process.env.FRONTEND_URL}/failure`,
                    pending: `${process.env.FRONTEND_URL}/pending`
                },
                notification_url: process.env.NOTIFICATION_URL,
                auto_return: 'approved'
            }
        });

        await Orden.create({
            usuario: idUsuario,
            productos: items.map(p => ({
                titulo: p.title,
                cantidad: p.quantity,
                precio_unitario: p.unit_price
            })),
            comprador: { email: emailComprador },
            id_preferencia: preferencia.id,
            estado_pago: 'pendiente'
        });

        res.status(200).json({ id: preferencia.id });

    } catch (error) {
        console.error('Error al crear preferencia:', error.message);
        res.status(500).json({ error: 'Error al procesar el pago' });
    }
};



exports.procesarWebhook = async (req, res) => {
    try {
        const idPago = req.query['data.id'];
        const tipo = req.query.type;

        if (tipo === 'payment') {
            const pago = await mercadopago.payments.get({ id: idPago });

            const {
                id,
                status,
                status_detail,
                date_approved,
                order: { id: idPreferencia } = {}
            } = pago;

            const orden = await Orden.findOneAndUpdate(
                { id_preferencia: idPreferencia },
                {
                    id_pago: id,
                    estado_pago: status,
                    detalle_estado: status_detail,
                    fecha_aprobado: date_approved
                },
                { new: true }
            );

            if (orden && status === 'approved') {
                // Vaciar el carrito del usuario
                await Carrito.findOneAndUpdate(
                    { usuario: orden.usuario },
                    { productos: [] }
                );

                console.log(`🧹 Carrito del usuario ${orden.usuario} vaciado.`);
            }

            console.log('🧾 Orden actualizada:', orden);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error en webhook:', error.message);
        res.sendStatus(500);
    }
};

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