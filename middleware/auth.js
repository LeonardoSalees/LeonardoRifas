const auth = (req, res, next) => {
    if (!req.session.adminId) {
        return res.status(401).json({ error: 'Acesso negado. Faça login como administrador.' });
    }
    next();
};

module.exports = auth;
