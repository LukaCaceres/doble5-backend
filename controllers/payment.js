const { MercadoPagoConfig, Preference, Payment, MerchantOrder } = require('mercadopago');
const client = require('../config/mercadoPago');
const Orden = require('../models/orden');
const Carrito = require('../models/carrito');
const Producto = require('../models/producto');

const preference = new Preference(client);
const payment = new Payment(client);
const merchantOrder = new MerchantOrder(client);

// Función reutilizable para buscar un pago con retries
const obtenerPago = async (idPago, reintentos = 5) => {
    for (let i = 0; i < reintentos; i++) {
        try {
            const { body } = await payment.get({ id: idPago });
            if (body) return body;
        } catch (err) {
            console.warn(`⏳ Intento ${i + 1}: aún no se encuentra el pago ${idPago}`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 segundos
        }
    }
    return null;
};

exports.procesarWebhook = async (req, res) => {
    try {
        console.log('📩 Webhook payload:', JSON.stringify(req.body));

        const tipo = req.body?.type || req.query?.type;
        const idPago = req.body?.data?.id || req.query['data.id'] || req.query?.id || req.body?.id;
        const topic = req.body?.topic || req.query?.topic;
        const resource = req.body?.resource;

        // 🟢 Prioridad 1: Webhook tipo "merchant_order"
        if (topic === 'merchant_order' && resource) {
            const idOrden = resource.split('/').pop();
            const { body: ordenMP } = await merchantOrder.get({ id: idOrden });

            if (ordenMP?.payments?.length > 0) {
                const pagoAprobado = ordenMP.payments.find(p => p.status === 'approved');
                if (pagoAprobado) {
                    console.log('🔁 Redireccionando webhook desde merchant_order a payment con id:', pagoAprobado.id);
                    req.body = { type: 'payment', data: { id: pagoAprobado.id } };
                    return exports.procesarWebhook(req, res); // Reinvocamos con el nuevo idPago
                }
            }

            return res.sendStatus(200); // No hay pagos aprobados aún
        }

        // 🟡 Segundo caso: tipo payment directo
        if (tipo === 'payment' && idPago) {
            const pago = await obtenerPago(idPago);
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
                    await Carrito.findOneAndUpdate({ usuario: orden.usuario }, { productos: [] });

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
            console.log('Webhook recibido pero no es de tipo payment ni merchant_order con ID válido');
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Error en webhook:', error.message);
        res.sendStatus(500);
    }
};


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






