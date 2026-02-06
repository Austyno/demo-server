const PaymentRequest = require('../models/PaymentRequest');
const User = require('../models/User');

const createRequest = async (req, res) => {
    try {
        const {
            descriptionEn, descriptionFr,
            beneficiary, bankName, accountNumber, referenceNumber,
            amount, currency, amountInWords,
            accountName, fundingSourceCode, quickBooksCode, requestDate
        } = req.body;
        // req.user.id is now ObjectId string from token
        const userId = req.user.id;
        const files = req.files || [];

        if (!descriptionEn || !descriptionFr) {
            return res.status(400).json({ message: 'Both English and French descriptions are required.' });
        }

        if (files.length === 0) {
            return res.status(400).json({ message: 'At least one supporting document is required.' });
        }

        const request = new PaymentRequest({
            descriptionEn,
            descriptionFr,
            beneficiary,
            bankName,
            accountNumber,
            referenceNumber,
            amount,
            currency,
            amountInWords,
            accountName,
            fundingSourceCode,
            quickBooksCode,
            requestDate,
            user: userId,
            status: 'DRAFT',
            documents: files.map(file => ({
                filePath: file.path,
                originalName: file.originalname
            }))
        });

        const savedRequest = await request.save();
        // Re-structure to match frontend expectation (id vs _id)
        // Frontend expects 'id', Mongoose gives '_id'. We can handle this in frontend or transform here.
        // For now, let's just return the object. Frontend might need slight adjustment if it strictly relies on 'id'.
        // Adjusting response to include 'id' field is good practice.

        const responseObj = savedRequest.toObject();
        responseObj.id = savedRequest._id;

        res.status(201).json(responseObj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating request.' });
    }
};

const getMyRequests = async (req, res) => {
    try {
        const { status } = req.query;
        const query = { user: req.user.id };
        if (status) {
            query.status = status;
        }
        const requests = await PaymentRequest.find(query)
            .populate('user', 'username')
            .populate('history.actor', 'username')
            .sort({ createdAt: -1 });
        const transformed = requests.map(doc => {
            const obj = doc.toObject();
            obj.id = doc._id;
            return obj;
        });
        res.json(transformed);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error fetching requests" });
    }
}

const getRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await PaymentRequest.findById(id).populate('history.actor', 'username');

        if (!request) return res.status(404).json({ message: "Request not found" });

        // Auth check
        if (request.user.toString() !== req.user.id) {
            const requester = await User.findById(request.user);
            if (requester.manager?.toString() !== req.user.id && req.user.role !== 'ADMIN') {
                return res.status(403).json({ message: "Unauthorized" });
            }
        }

        const obj = request.toObject();
        obj.id = request._id;
        res.json(obj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error fetching request" });
    }
};

const updateRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            descriptionEn, descriptionFr,
            beneficiary, bankName, accountNumber, referenceNumber,
            amount, currency, amountInWords,
            accountName, fundingSourceCode, quickBooksCode, requestDate
        } = req.body;
        const files = req.files || [];

        const request = await PaymentRequest.findById(id);
        if (!request) return res.status(404).json({ message: "Request not found" });
        if (request.user.toString() !== req.user.id) return res.status(403).json({ message: "Unauthorized" });

        if (request.status !== 'DRAFT' && request.status !== 'MINUTED') {
            return res.status(400).json({ message: "Cannot edit request in current status" });
        }

        request.descriptionEn = descriptionEn;
        request.descriptionFr = descriptionFr;
        if (beneficiary) request.beneficiary = beneficiary;
        if (bankName) request.bankName = bankName;
        if (accountNumber) request.accountNumber = accountNumber;
        if (referenceNumber) request.referenceNumber = referenceNumber;
        if (amount) request.amount = amount;
        if (currency) request.currency = currency;
        if (amountInWords) request.amountInWords = amountInWords;
        if (accountName) request.accountName = accountName;
        if (fundingSourceCode) request.fundingSourceCode = fundingSourceCode;
        if (quickBooksCode) request.quickBooksCode = quickBooksCode;
        if (requestDate) request.requestDate = requestDate;
        if (files.length > 0) {
            files.forEach(file => {
                request.documents.push({
                    filePath: file.path,
                    originalName: file.originalname
                });
            });
        }

        const updatedRequest = await request.save();
        const obj = updatedRequest.toObject();
        obj.id = updatedRequest._id;
        res.json(obj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error updating request" });
    }
};

const submitRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await PaymentRequest.findById(id);

        if (!request) return res.status(404).json({ message: "Request not found" });
        if (request.user.toString() !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
        if (request.status !== 'DRAFT' && request.status !== 'MINUTED') {
            return res.status(400).json({ message: "Only Draft or Minuted requests can be submitted" });
        }

        request.status = 'PENDING';
        request.history.push({
            action: 'SUBMIT',
            actor: req.user.id
        });

        const updatedRequest = await request.save();
        const obj = updatedRequest.toObject();
        obj.id = updatedRequest._id;
        res.json(obj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error submitting request" });
    }
};

const getPendingRequests = async (req, res) => {
    try {
        // Find subordinates
        const subordinates = await User.find({ manager: req.user.id }).select('_id');
        const subordinateIds = subordinates.map(u => u._id);

        const requests = await PaymentRequest.find({
            user: { $in: subordinateIds },
            status: 'PENDING'
        }).populate('user', 'username').sort({ createdAt: -1 });

        const transformed = requests.map(doc => {
            const obj = doc.toObject();
            obj.id = doc._id;
            return obj;
        });

        res.json(transformed);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error fetching pending requests" });
    }
};

const getSubordinateRequests = async (req, res) => {
    try {
        const { status } = req.query;
        // Find subordinates
        const subordinates = await User.find({ manager: req.user.id }).select('_id');
        const subordinateIds = subordinates.map(u => u._id);

        const query = { user: { $in: subordinateIds } };
        if (status) {
            query.status = status;
        }

        const requests = await PaymentRequest.find(query)
            .populate('user', 'username')
            .populate('history.actor', 'username')
            .sort({ createdAt: -1 });

        const transformed = requests.map(doc => {
            const obj = doc.toObject();
            obj.id = doc._id;
            return obj;
        });

        res.json(transformed);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error fetching subordinate requests" });
    }
};

const processRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, comment } = req.body;

        const request = await PaymentRequest.findById(id);
        if (!request) return res.status(404).json({ message: "Request not found" });

        const requester = await User.findById(request.user);
        if (requester.manager?.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not the manager for this request" });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({ message: "Request is not pending" });
        }

        let newStatus;
        if (action === 'APPROVE') newStatus = 'APPROVED';
        else if (action === 'REJECT') {
            if (!comment) return res.status(400).json({ message: "Reason required for rejection" });
            newStatus = 'REJECTED';
        }
        else if (action === 'MINUTE') {
            if (!comment) return res.status(400).json({ message: "Comments required for minuting back" });
            newStatus = 'MINUTED';
        }
        else {
            return res.status(400).json({ message: "Invalid action" });
        }

        request.status = newStatus;
        request.history.push({
            action: action,
            comment: comment,
            actor: req.user.id
        });

        const updatedRequest = await request.save();
        const obj = updatedRequest.toObject();
        obj.id = updatedRequest._id;
        res.json(obj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error processing request" });
    }
};

module.exports = {
    createRequest,
    getMyRequests,
    getRequestById,
    updateRequest,
    submitRequest,
    getPendingRequests,
    getSubordinateRequests,
    processRequest
};
