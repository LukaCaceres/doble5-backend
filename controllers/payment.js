const mercadopago = require('../config/mercadoPago');
const Orden = require('../models/orden');
const Carrito = require('../models/carrito');



exports.crearPreferencia = async (req, res) => {
    try {
        console.log("↪️ Entrando a crearPreferencia");
        console.log("🔐 Usuario:", req.usuario);

        if (!req.usuario) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const idUsuario = req.usuario._id;
        const emailComprador = req.usuario.email;

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

        const preferencia = await mercadopago.preference.create({
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


        console.log("✅ Preferencia creada:", preferencia.id);

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
        console.error('❌ Error al crear preferencia:', error);
        res.status(500).json({ error: 'Error al procesar el pago' });
    }
};




exports.procesarWebhook = async (req, res) => {
  try {
    const idPago = req.query['data.id'];
    const tipo = req.query.type;

    if (tipo === 'payment') {
      const pago = await mercadopago.payment.get({ id: idPago }); // ← uso correcto del nuevo SDK

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
        await Carrito.findOneAndUpdate({ usuario: orden.usuario }, { productos: [] });

        for (const item of orden.productos) {
          await Producto.findOneAndUpdate(
            { nombre: item.titulo, 'talles.talle': item.talle },
            { $inc: { 'talles.$.stock': -item.cantidad } }
          );
        }

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

