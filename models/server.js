const express = require('express');
const cors = require('cors');
const { dbConection } = require('../database/config');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT;
        this.authPath = '/api/auth';
        this.usuariosPath = '/api/usuario';
        this.productosPath = '/api/producto';
        this.ventaPath = '/api/venta';
        this.categoriaPath = '/api/categoria';
        this.carritoPath = '/api/carrito';
        this.favoritoPath = '/api/favorito';

        // Conectar con la DB
        this.conectarDB();

        // Middlewares
        this.middlewares();

        // Funciones de las rutas
        this.routes();
    }

    async conectarDB() {
        await dbConection();
    }

    middlewares() { 
        // Configurar CORS para permitir solo ciertos orígenes
        this.app.use(cors({
            origin: ['http://localhost:5173', 'https://clancydevsign.netlify.app'], // Lista de orígenes permitidos
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
            allowedHeaders: ['Content-Type', 'Authorization', "x-token"],
            credentials: true, 
        }));

        // Leer lo que envía el usuario por el body de la petición
        this.app.use(express.json());

        // Definir la carpeta pública que creamos
        this.app.use(express.static('public'));
    }

    routes() {
        this.app.use(this.authPath, require('../routes/auth'));
        this.app.use(this.usuariosPath, require('../routes/usuario'));
        this.app.use(this.productosPath, require('../routes/producto'));
        this.app.use(this.ventaPath, require('../routes/venta'));
        this.app.use(this.categoriaPath, require('../routes/categoria'));
        this.app.use(this.carritoPath, require('../routes/carrito'));
        this.app.use(this.favoritoPath, require('../routes/favorito'));
    }

    listen() {
        this.app.listen(this.port, () => {
            console.log('Server online port: ', this.port);
        });
    }
}

module.exports = Server;
