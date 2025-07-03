const { MercadoPagoConfig, Preference, Payment, MerchantOrder } = require('mercadopago');
const client = require('../config/mercadoPago');
const Orden = require('../models/orden');
const Carrito = require('../models/carrito');
const Producto = require('../models/producto');

const preference = new Preference(client);
const payment = new Payment(client);
const merchantOrder = new MerchantOrder(client);

// Función mejorada para buscar un pago con retries
const obtenerPago = async (idPago, reintentos = 5) => {
    for (let i = 0; i < reintentos; i++) {
        try {
            const pago = await payment.get({ id: idPago });
            if (pago && pago.body) return pago.body;
        } catch (err) {
            console.warn(`⏳ Intento ${i + 1}: Error al buscar pago ${idPago} - ${err.message}`);
            await new Promise(resolve => setTimeout(resolve, 3000 * (i + 1))); // Retry con backoff exponencial
        }
    }
    throw new Error(`No se pudo obtener el pago ${idPago} después de ${reintentos} intentos`);
};

// Extraer ID de la URL de recurso
const extraerIdDeUrl = (url) => {
    if (!url) return null;
    const match = url.match(/\/(\d+)$/);
    return match ? match[1] : null;
};

exports.procesarWebhook = async (req, res) => {
    try {
        console.log('📩 Webhook payload:', JSON.stringify(req.body, null, 2));

        // Extracción mejorada de parámetros
        const tipo = req.body?.type;
        const idPago = req.body?.data?.id || extraerIdDeUrl(req.body?.resource);
        const topic = req.body?.topic;
        const resource = req.body?.resource;
        const action = req.body?.action;

        // 🟢 Caso 1: Webhook de merchant_order
        if (topic === 'merchant_order' && resource) {
            const idOrden = extraerIdDeUrl(resource);
            if (!idOrden) {
                console.warn('⚠️ No se pudo extraer ID de merchant_order');
                return res.sendStatus(400);
            }

            console.log(`📦 Buscando merchant_order con ID: ${idOrden}`);
            try {
                const ordenMP = await merchantOrder.get({ merchantOrderId: idOrden });

                if (ordenMP?.body?.payments?.length > 0) {
                    const pagoAprobado = ordenMP.body.payments.find(p => p.status === 'approved');
                    if (pagoAprobado) {
                        console.log('🔁 Redireccionando webhook a payment con id:', pagoAprobado.id);
                        req.body = { type: 'payment', data: { id: pagoAprobado.id } };
                        return exports.procesarWebhook(req, res);
                    }
                }
                return res.sendStatus(200);
            } catch (err) {
                console.error('❌ Error al obtener merchant_order:', err.message);
                return res.sendStatus(500);
            }
        }

        // 🟡 Caso 2: Webhook de payment
        if ((tipo === 'payment' || action === 'payment.created') && idPago) {
            try {
                const pago = await obtenerPago(idPago);

                const {
                    id,
                    status,
                    status_detail,
                    date_approved,
                    order = {}
                } = pago;

                const idPreferencia = order.id || id; // Algunos pagos tienen el ID de preferencia en order.id

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
                    console.log(`🧾 Orden actualizada: ${orden._id} - Estado: ${status}`);

                    if (status === 'approved') {
                        // Vaciar carrito y actualizar stock
                        await Carrito.findOneAndUpdate(
                            { usuario: orden.usuario },
                            { productos: [] }
                        );

                        // Actualizar stock de productos
                        const bulkOps = orden.productos.map(item => ({
                            updateOne: {
                                filter: {
                                    nombre: item.titulo,
                                    'talles.talle': item.talle
                                },
                                update: {
                                    $inc: { 'talles.$.stock': -item.cantidad }
                                }
                            }
                        }));

                        if (bulkOps.length > 0) {
                            await Producto.bulkWrite(bulkOps);
                        }

                        console.log(`🧹 Carrito vaciado y stock actualizado para usuario ${orden.usuario}`);
                    }
                } else {
                    console.warn(`⚠️ No se encontró orden con id_preferencia ${idPreferencia}`);
                }

                return res.sendStatus(200);
            } catch (error) {
                console.error('❌ Error al procesar pago:', error.message);
                return res.status(500).send('Error al procesar pago');
            }
        }

        // 🔵 Otros casos no manejados
        console.log('ℹ️ Webhook recibido pero no manejado:', { tipo, topic, action, idPago });
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Error crítico en webhook:', error);
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






