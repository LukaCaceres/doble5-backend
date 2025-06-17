const Carrito = require('./carrito');
const Favorito = require('./favorito');
const { Schema, model } = require('mongoose');


const UsuarioSchema = Schema({
    nombre: { type: String, required: [true, 'El nombre es obligatorio'] },
    correo: { type: String, required: [true, 'El correo es obligatorio'], unique: true },
    password: { type: String, required: [true, 'El contraseña es obligatoria'] },
    carrito: { type: Schema.Types.ObjectId, ref: 'Carrito' },
    favorito: { type: Schema.Types.ObjectId, ref: 'Favorito' },
    rol: { type: String, required: true, default: 'USER_ROLE' },
    estado: { type: Boolean, default: true },
    resetToken: { type: String, default: "" }
});

// Hook pre-save para crear y asignar carrito y favoritos solo en la creación del usuario
UsuarioSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            // Crear un nuevo carrito y asignar el usuario al carrito
            const nuevoCarrito = new Carrito({ usuario: this._id, productos: [] });
            await nuevoCarrito.save();
            this.carrito = nuevoCarrito._id;

            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});


//quitar datos extras en la respuesta JSON
UsuarioSchema.methods.toJSON = function () {
    const { __v, password, _id, ...usuario } = this.toObject();
    usuario.uid = _id;
    return usuario;
};
module.exports = model('Usuario', UsuarioSchema);