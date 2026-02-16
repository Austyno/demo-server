const express = require('express');
const router = express.Router();
const { getNextReferenceNumber, createPaymentVoucher } = require('../controllers/paymentVoucherController');
const { authenticateToken } = require('../middleware/authMiddleware'); // Optional: protect if needed

// Route to get the next auto-increment reference number
router.get('/next-ref', authenticateToken, getNextReferenceNumber);

// Route to create a new payment voucher
router.post('/', authenticateToken, createPaymentVoucher);

module.exports = router;
