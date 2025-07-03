const client = require('../config/mercadoPago');
const Orden = require('../models/orden');
const Carrito = require('../models/carrito');
const Producto = require('../models/producto');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const preference = new Preference(client);
const payment = new Payment(client)

exports.crearPreferencia = async (req, res) => {
    try {
        console.log("↪️ Entrando a crearPreferencia");
        console.log("🔐 Usuario:", req.usuario);

        if (!req.usuario) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const idUsuario = req.usuario._id;
        const emailComprador = req.usuario.email;
        const nombreComprador = req.usuario.nombre;

        const carrito = await Carrito.findOne({ usuario: idUsuario }).populate('productos.producto');

        if (!carrito || carrito.productos.length === 0) {
            console.log("🛒 Carrito vacío o no encontrado");
            return res.status(400).json({ error: 'El carrito está vacío.' });
        }

        console.log("📦 Productos en carrito:", carrito.productos);

        const items = carrito.productos.map(item => ({
            title: item.producto.nombre,
            quantity: item.cantidad,
            unit_price: item.producto.precio
        }));

        const preferencia = await preference.create({
            body: {
                items,
                payer: {
                    name: nombreComprador,
                    email: emailComprador,

                },
                payment_methods: {
                    excluded_payment_types: [
                        { id: 'ticket' },      // Excluye pagos en efectivo con ticket (rapipago, pago fácil)
                        { id: 'atm' },         // Excluye pagos por cajero automático
                    ],
                    installments: 12,  // Máximo cuotas (podés cambiar)
                },
                back_urls: {
                    success: `${process.env.FRONTEND_URL}/success`,
                    failure: `${process.env.FRONTEND_URL}/failure`,
                    pending: `${process.env.FRONTEND_URL}/pending`
                },
                notification_url: process.env.NOTIFICATION_URL,
                auto_return: 'approved'
            }
        });


        console.log("✅ Preferencia creada:", preferencia.id);

        await Orden.create({
            usuario: idUsuario,
            productos: carrito.productos.map(item => ({
                titulo: item.producto.nombre,
                cantidad: item.cantidad,
                precio_unitario: item.producto.precio,
                talle: item.talle
            })),
            comprador: { email: emailComprador },
            id_preferencia: preferencia.id,
            estado_pago: 'pendiente'
        });

        res.status(200).json({ id: preferencia.id });

    } catch (error) {
        console.error('❌ Error al crear preferencia:', error);
        res.status(500).json({ error: 'Error al procesar el pago' });
    }
};




exports.procesarWebhook = async (req, res) => {
    try {
        const idPago = req.body?.data?.id;
        const tipo = req.body?.type;

        if (tipo === 'payment' && idPago) {
            const { body: pago } = await payment.get({ id: idPago });

            if (!pago) {
                console.warn(`⚠️ Pago con id ${idPago} no encontrado.`);
                return res.sendStatus(404);
            }

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

            if (orden) {
                console.log(`🧾 Orden actualizada: ${orden._id}`);

                if (status === 'approved') {
                    // Vaciar carrito
                    await Carrito.findOneAndUpdate({ usuario: orden.usuario }, { productos: [] });

                    // Descontar stock por talle
                    for (const item of orden.productos) {
                        await Producto.findOneAndUpdate(
                            { nombre: item.titulo, 'talles.talle': item.talle },
                            { $inc: { 'talles.$.stock': -item.cantidad } }
                        );
                    }

                    console.log(`🧹 Carrito del usuario ${orden.usuario} vaciado y stock actualizado.`);
                }
            } else {
                console.warn(`⚠️ No se encontró orden con id_preferencia ${idPreferencia}`);
            }
        } else {
            console.log('Webhook recibido pero no es de tipo payment o no tiene idPago');
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Error en webhook:', error.message);
        res.sendStatus(500);
    }
};


