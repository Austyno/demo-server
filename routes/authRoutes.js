const express = require('express');
const { login, searchUsers, updateLanguage } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.get('/search-users', authenticateToken, searchUsers);
router.put('/update-language', authenticateToken, updateLanguage);

module.exports = router;
