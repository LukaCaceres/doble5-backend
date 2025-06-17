const { Schema, model } = require('mongoose');

const VentaSchema = Schema({
    usuario: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: [true, 'El usuario es obligatorio']
    },
    productos: [{
        producto: {
            type: Schema.Types.ObjectId,
            ref: 'Producto',
            required: [true, 'El producto es obligatorio']
        },
        cantidad: {
            type: Number,
            default: 1
        }
    }],
    total: {
        type: Number,
        required: true, 
    },
    comprobante: {
        type: Boolean,
        default: false 
    },
    numeroComprobante: {
        type: String,
        default: null 
    },
    estadoPago: {
        type: String,
        enum: ['pendiente', 'verificado', 'rechazado'],
        default: 'pendiente' 
    },
    finalizada: {
        type: Boolean,
        default: false 
    },
    fechaCreacion: {
        type: Date,
        default: Date.now 
    },
    fechaFinalizacion: {
        type: Date,
        default: null 
    }
});

module.exports = model('Venta', VentaSchema);
