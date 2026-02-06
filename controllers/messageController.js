const Message = require('../models/Message');

// Get message history for the logged-in user
exports.getMessages = async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { recipient: req.user.id, recipientArchived: false },
                { sender: req.user.id, senderArchived: false }
            ]
        })
        .populate('sender', 'username')
        .populate('recipient', 'username')
        .sort({ createdAt: -1 });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
};

// Get unread message count
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Message.countDocuments({
            recipient: req.user.id,
            isRead: false,
            recipientArchived: false
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching unread count', error: error.message });
    }
};

// Send a new message
exports.sendMessage = async (req, res) => {
    const { recipientId, title, content } = req.body;
    try {
        const newMessage = new Message({
            sender: req.user.id,
            recipient: recipientId,
            title,
            content
        });

        await newMessage.save();

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'username')
            .populate('recipient', 'username');

        // Emit via Socket.io
        const io = req.app.get('socketio');
        io.to(recipientId).emit('newMessage', populatedMessage);

        res.status(201).json(populatedMessage);
    } catch (error) {
        res.status(500).json({ message: 'Error sending message', error: error.message });
    }
};

// Mark message as read
exports.markAsRead = async (req, res) => {
    try {
        const message = await Message.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { isRead: true },
            { new: true }
        );
        if (!message) return res.status(404).json({ message: 'Message not found' });
        res.json(message);
    } catch (error) {
        res.status(500).json({ message: 'Error marking message as read', error: error.message });
    }
};

// Archive a message
exports.archiveMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (message.sender.toString() === req.user.id) {
            message.senderArchived = true;
        } else if (message.recipient.toString() === req.user.id) {
            message.recipientArchived = true;
        } else {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await message.save();
        res.json({ message: 'Message archived' });
    } catch (error) {
        res.status(500).json({ message: 'Error archiving message', error: error.message });
    }
};
