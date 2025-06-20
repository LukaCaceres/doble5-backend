// models/Orden.js
const mongoose = require('mongoose');

const ordenSchema = new mongoose.Schema({
  productos: [
    {
      titulo: String,
      cantidad: Number,
      precio_unitario: Number
    }
  ],
  comprador: {
    email: String
  },
  id_pago: String,
  estado_pago: String,
  id_preferencia: String,
  detalle_estado: String,
  fecha_aprobado: Date,
  creadoEn: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Orden', ordenSchema);
