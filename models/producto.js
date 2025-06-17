const { Schema, model } = require('mongoose');
const ProductoSchema = Schema({
    nombre: { type: String, required: [true, 'El nombre es obligatorio'], unique: true },
    descripcion: { type: String, required: [true, 'La descripcion es obligatoria'] },
    categoria: { type: String, required: [true, 'La categoría es obligatoria'] },
    precio: { type: Number, required: [true, 'El precio es obligatorio'], min: 0 },
    imagenes: [
        { type: String }
    ],
    activo: { type: Boolean, default: true },
    destacado: { type: Boolean, default: false }
})

module.exports = model('Producto', ProductoSchema) 