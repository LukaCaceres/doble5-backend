const mercadopago = require('../config/mercadoPago');
const Orden = require('../models/orden');
const Carrito = require('../models/carrito');
const Producto = require('../models/producto');

const preferencias = mercadopago.preferences;

exports.crearPreferencia = async (req, res) => {
  try {
    const { idUsuario } = req.body;

    // 1. Buscar el carrito del usuario y traer detalles del producto
    const carrito = await Carrito.findOne({ usuario: idUsuario }).populate('productos.producto');

    if (!carrito || carrito.productos.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío.' });
    }

    // 2. Transformar productos al formato que espera Mercado Pago
    const items = carrito.productos.map(item => ({
      title: item.producto.nombre,
      quantity: item.cantidad,
      unit_price: item.producto.precio
    }));

    // 3. Crear preferencia
    const respuesta = await preferencias.create({
      body: {
        items,
        payer: {
          email: req.body.emailComprador // El frontend puede enviar el email del comprador
        },
        back_urls: {
          success: 'http://localhost:3000/exito',
          failure: 'http://localhost:3000/error',
          pending: 'http://localhost:3000/pendiente'
        },
        notification_url: process.env.MP_NOTI_URL,
        auto_return: 'approved'
      }
    });

    // 4. Guardar la orden en la base de datos
    await Orden.create({
      productos: items.map(p => ({
        titulo: p.title,
        cantidad: p.quantity,
        precio_unitario: p.unit_price
      })),
      comprador: { email: req.body.emailComprador },
      id_preferencia: respuesta.id,
      estado_pago: 'pendiente'
    });

    res.status(200).json({ id: respuesta.id });

  } catch (error) {
    console.error('Error al crear preferencia:', error.message);
    res.status(500).json({ error: 'Error al procesar el pago' });
  }
};
