const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, messageController.getMessages);
router.get('/unread', authenticateToken, messageController.getUnreadCount);
router.post('/', authenticateToken, messageController.sendMessage);
router.put('/:id/read', authenticateToken, messageController.markAsRead);
router.put('/:id/archive', authenticateToken, messageController.archiveMessage);

module.exports = router;
