const express = require('express');
const router = express.Router();
const { getBanks, seedBanks } = require('../controllers/bankController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, getBanks);
router.post('/seed', seedBanks); // Public or protected? Let's keep it open for easy fix now, or use auth if needed.
// Actually, let's allow it to be hit easily.

module.exports = router;
