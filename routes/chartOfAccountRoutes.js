const express = require('express');
const router = express.Router();
const { getChartOfAccounts } = require('../controllers/chartOfAccountController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, getChartOfAccounts);

module.exports = router;
