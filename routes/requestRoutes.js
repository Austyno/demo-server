const express = require('express');
const { createRequest, getRequests, getRequestById, updateRequest, submitRequest, getSubordinateRequests, processRequest, getEDRequests } = require('../controllers/requestController');
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
    getRequests
);

// Get subordinate requests (Manager) - filtered by status
router.get(
    '/subordinates',
    authenticateToken,
    authorizeRole(['MANAGER', 'ED']), // ED might want to see subordinates too if we decide so, but mainly for Manager
    getSubordinateRequests
);

// Get requests for ED
router.get(
    '/ed-tasks',
    authenticateToken,
    authorizeRole(['ED']),
    getEDRequests
);

// Submit request
router.put(
    '/:id/submit',
    authenticateToken,
    authorizeRole(['CLERK']),
    submitRequest
);

// Process request (Approve/Reject/Return)
router.put(
    '/:id/process',
    authenticateToken,
    authorizeRole(['MANAGER', 'ED']),
    processRequest
);

// Get single request
router.get(
    '/:id',
    authenticateToken,
    getRequestById
);

// Update request (Edit)
router.put(
    '/:id',
    authenticateToken,
    authorizeRole(['CLERK', 'MANAGER']), // Manager can now edit
    upload.array('documents', 5),
    updateRequest
);

module.exports = router;
