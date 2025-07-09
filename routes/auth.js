const express = require('express');
const router = express.Router();
const path = require('path');
const auth = require('../middleware/auth');

// Serve admin.html only if authenticated
router.get('/admin.html', auth, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Redirect /admin to /admin.html if authenticated
router.get('/admin', auth, (req, res) => {
    res.redirect('/admin.html');
});

module.exports = router;