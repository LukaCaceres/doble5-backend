const { Schema, model } = require('mongoose');

const CarritoSchema = Schema({
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    productos: [{
        producto: { type: Schema.Types.ObjectId, ref: 'Producto', required: true },
        cantidad: { type: Number, default: 1 }
    }]
});

module.exports = model('Carrito', CarritoSchema);
