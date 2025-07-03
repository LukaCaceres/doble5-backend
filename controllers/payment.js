const { MercadoPagoConfig, Preference, Payment, MerchantOrder } = require('mercadopago');
const client = require('../config/mercadoPago');
const Orden = require('../models/orden');
const Carrito = require('../models/carrito');
const Producto = require('../models/producto');

const preference = new Preference(client);
const payment = new Payment(client);
const merchantOrder = new MerchantOrder(client);

// Configuración de reintentos
const MAX_RETRIES = 8; // Aumentamos los reintentos
const RETRY_DELAY = 4000; // 4 segundos de espera base

// Función mejorada para buscar un pago con retries inteligentes
const obtenerPago = async (idPago, reintentos = MAX_RETRIES) => {
    for (let i = 0; i < reintentos; i++) {
        try {
            const pago = await payment.get({ id: idPago });
            if (pago && pago.body) {
                console.log(`✅ Pago ${idPago} obtenido en intento ${i + 1}`);
                return pago.body;
            }
        } catch (err) {
            const delay = RETRY_DELAY * (i + 1); // Backoff exponencial
            console.warn(`⏳ Intento ${i + 1}: Error al buscar pago ${idPago} - ${err.message}. Reintentando en ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error(`No se pudo obtener el pago ${idPago} después de ${reintentos} intentos`);
};

// Función mejorada para extraer IDs de diferentes formatos
const extraerIdPago = (body) => {
    // Caso 0: Webhook tipo payment con resource numérico directo
    if (body.topic === 'payment' && body.resource && !isNaN(body.resource)) {
        return body.resource.toString();
    }
    // Caso 1: payment.created action
    if (body.action === 'payment.created') {
        return body.data?.id;
    }
    
    // Caso 2: Resource directo (puede ser URL o ID)
    if (body.resource) {
        if (typeof body.resource === 'string') {
            // Si es una URL, extraemos el ID final
            const match = body.resource.match(/\/(\d+)$/);
            if (match) return match[1];
            // Si no es URL pero es un string numérico, lo usamos directamente
            if (/^\d+$/.test(body.resource)) return body.resource;
        }
        // Si es un número directamente
        if (typeof body.resource === 'number') return body.resource.toString();
    }
    
    // Caso 3: Data ID directo
    if (body.data?.id) {
        return body.data.id;
    }
    
    // Caso 4: ID directo en el cuerpo
    if (body.id) {
        return body.id.toString();
    }
    
    return null;
};

exports.procesarWebhook = async (req, res) => {
    try {
        console.log('📩 Webhook payload:', JSON.stringify(req.body, null, 2));

        const tipo = req.body?.type;
        const topic = req.body?.topic;
        const action = req.body?.action;
        
        // Extracción mejorada del ID de pago
        const idPago = extraerIdPago(req.body);
        
        console.log(`ℹ️ Parámetros identificados:`, { 
            tipo, 
            topic, 
            action, 
            idPago: idPago || 'no identificado' 
        });

        // 🟢 Caso 1: Webhook de merchant_order
        if (topic === 'merchant_order' && req.body.resource) {
            const idOrden = extraerIdPago(req.body);
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

        // 🟡 Caso 2: Webhook de payment (todos los formatos)
        if (idPago && (topic === 'payment' || action === 'payment.created' || tipo === 'payment')) {
            try {
                console.log(`🔍 Procesando pago con ID: ${idPago}`);
                const pago = await obtenerPago(idPago);
                
                if (!pago) {
                    console.warn(`⚠️ No se encontraron datos para el pago ${idPago}`);
                    return res.sendStatus(404);
                }

                const { 
                    id,
                    status,
                    status_detail,
                    date_approved,
                    order = {}
                } = pago;

                // Obtenemos el ID de preferencia de diferentes lugares posibles
                const idPreferencia = order.id || pago.metadata?.preference_id || id;

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

                        // Actualizar stock de productos (operación atómica)
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
                            console.log(`📊 Stock actualizado para ${bulkOps.length} productos`);
                        }

                        console.log(`🧹 Carrito vaciado para usuario ${orden.usuario}`);
                    }
                } else {
                    console.warn(`⚠️ No se encontró orden con id_preferencia ${idPreferencia}`);
                    // Podrías crear una orden aquí si es necesario
                }

                return res.sendStatus(200);
            } catch (error) {
                console.error('❌ Error al procesar pago:', error.message);
                // Envía un 200 para que MercadoPago no reintente constantemente
                return res.sendStatus(200);
            }
        }

        // 🔵 Caso no manejado (registramos para análisis)
        console.warn('⚠️ Webhook no manejado. Datos completos:', {
            headers: req.headers,
            body: req.body
        });
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






