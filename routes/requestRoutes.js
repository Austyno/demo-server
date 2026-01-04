const express = require('express');
const { createRequest, getMyRequests } = require('../controllers/requestController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Create new request
router.post(
    '/',
    authenticateToken,
    authorizeRole(['CLERK']),
    upload.array('documents', 5), // Allow up to 5 files
    createRequest
);

// Get my requests (Clerk)
router.get(
    '/',
    authenticateToken,
    authorizeRole(['CLERK']),
    getMyRequests
);

// Submit request
router.put(
    '/:id/submit',
    authenticateToken,
    authorizeRole(['CLERK']),
    require('../controllers/requestController').submitRequest
);

// Get pending requests (Manager)
router.get(
    '/pending',
    authenticateToken,
    authorizeRole(['MANAGER']),
    require('../controllers/requestController').getPendingRequests
);

// Get subordinate requests (Manager) - filtered by status
router.get(
    '/subordinates',
    authenticateToken,
    authorizeRole(['MANAGER']),
    require('../controllers/requestController').getSubordinateRequests
);

// Process request (Approve/Reject/Minute)
router.put(
    '/:id/process',
    authenticateToken,
    authorizeRole(['MANAGER']),
    require('../controllers/requestController').processRequest
);

// Get single request
router.get(
    '/:id',
    authenticateToken,
    require('../controllers/requestController').getRequestById
);

// Update request (Edit)
router.put(
    '/:id',
    authenticateToken,
    authorizeRole(['CLERK']),
    upload.array('documents', 5),
    require('../controllers/requestController').updateRequest
);

module.exports = router;
