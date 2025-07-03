const { Schema, model } = require('mongoose');

const FavoritoSchema = Schema({
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    productos: [{
        producto: {type: Schema.Types.ObjectId, ref: 'Producto', require: [true, 'el producto es obligatorio']},
    }],
});

module.exports = model('Favorito', FavoritoSchema);