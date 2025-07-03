const Categoria = require('../models/categoria');


const categoriaGET = async (req, res) => {
    const categorias = await Categoria.find();
    res.json({
        msg: 'Categorías obtenidas correctamente',
        categorias
    });
};


const categoriaPOST = async (req, res) => {
    const { categoria } = req.body;
    const nuevaCategoria = new Categoria({ categoria });

    await nuevaCategoria.save();
    res.status(201).json({
        msg: 'Categoría creada correctamente',
        categoria: nuevaCategoria
    });
};


const categoriaPUT = async (req, res) => {
    const { id } = req.params;
    const { categoria } = req.body;

    const categoriaActualizada = await Categoria.findByIdAndUpdate(id, { categoria }, { new: true });
    res.json({
        msg: 'Categoría actualizada correctamente',
        categoria: categoriaActualizada
    });
};


const categoriaDELETE = async (req, res) => {
    const { id } = req.params;

    const categoriaEliminada = await Categoria.findByIdAndDelete(id);
    res.json({
        msg: 'Categoría eliminada correctamente',
        categoria: categoriaEliminada
    });
};

module.exports = {
    categoriaGET,
    categoriaPOST,
    categoriaPUT,
    categoriaDELETE
};
