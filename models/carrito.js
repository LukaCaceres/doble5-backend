const { Schema, model } = require('mongoose');

const CarritoSchema = Schema({
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    productos: [{
        producto: { type: Schema.Types.ObjectId, ref: 'Producto' },
        cantidad: Number,
        talle: String
    }]

});

module.exports = model('Carrito', CarritoSchema);
