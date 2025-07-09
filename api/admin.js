// Specific route handler for admin paths
const app = require('../server');

module.exports = (req, res) => {
    // Set the original URL for proper routing
    req.url = req.url.replace('/api/admin', '/admin');
    return app(req, res);
};