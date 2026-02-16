const PaymentRequest = require('../models/PaymentRequest');
const PaymentRequestLetter = require('../models/PaymentRequestLetter');
const PaymentVoucher = require('../models/PaymentVoucher');
const SupportingDocument = require('../models/SupportingDocument');
const Counter = require('../models/Counter');
const User = require('../models/User');
const { generateRequestPdf, signAndLockPdf } = require('../utils/pdfService');

const createRequest = async (req, res) => {
    try {
        let {
            paymentRequestBody, // Rich text content
            beneficiary, amount, currency, amountInWords,
            bankName, accountNumber, accountName,
            fundingSourceCode, quickBooksCode,
            descriptionEn, descriptionFr,
            items, totalAmount
        } = req.body;

        if (items && typeof items === 'string') {
            try {
                items = JSON.parse(items);
            } catch (e) {
                console.error("Failed to parse items", e);
            }
        }

        const userId = req.user.id;
        let managerId = req.user.manager;

        if (!managerId) {
            const userInDb = await User.findById(userId);
            managerId = userInDb?.manager;
        }

        if (!managerId) {
            // If the user is a MANAGER, maybe we should find an ED automatically if not assigned?
            // For now, let's just stick to the assigned manager but provide a better error.
            return res.status(400).json({ message: "You do not have an approval manager (e.g. ED or Senior Manager) assigned to your account." });
        }

        // 1. Get Auto-Increment ID
        const counter = await Counter.findByIdAndUpdate(
            { _id: 'payment_request_id' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const referenceNumber = `ONLINE-${counter.seq.toString().padStart(4, '0')}`;

        // 2. Create Parent Payment Request
        const paymentRequest = new PaymentRequest({
            referenceNumber,
            user: userId,
            manager: managerId,
            status: 'PENDING_MANAGER',
            history: [{
                action: 'CREATED',
                actor: userId,
                comment: 'Request created'
            }]
        });
        await paymentRequest.save();

        // 3. Create Letter
        const letter = new PaymentRequestLetter({
            paymentRequest: paymentRequest._id,
            content: paymentRequestBody || ''
        });
        await letter.save();

        // 4. Create Voucher
        const voucher = new PaymentVoucher({
            paymentRequest: paymentRequest._id,
            referenceNumber, // Added to ensure it exists in voucher
            beneficiary,
            amount: totalAmount || amount,
            totalAmount: totalAmount || amount,
            currency: currency || 'USD',
            amountInWords,
            bankName,
            accountNumber,
            accountName,
            fundingSourceCode,
            quickBooksCode,
            descriptionEn,
            descriptionFr,
            items: items && items.length > 0 ? items : [{ particulars: descriptionEn || descriptionFr || 'Payment', amount: amount || 0, accountName, fundingSourceCode, quickBooksCode }]
        });
        await voucher.save();

        // 5. Create Supporting Documents
        if (req.files && req.files.length > 0) {
            const documents = req.files.map(file => ({
                paymentRequest: paymentRequest._id,
                fileName: file.originalname,
                filePath: file.path,
                fileType: file.mimetype,
                fileSize: file.size,
                uploadedBy: userId
            }));
            await SupportingDocument.insertMany(documents);
        }

        // 6. Generate PDF
        try {
            const username = req.user.username || 'System';
            // Construct data object for PDF generation
            const pdfData = {
                ...voucher.toObject(),
                paymentRequestBody: letter.content,
                referenceNumber: paymentRequest.referenceNumber,
                requestDate: paymentRequest.createdAt,
                _id: paymentRequest._id
            };

            const pdfPath = await generateRequestPdf(pdfData, username);
            
            // Update Letter with PDF path (or Parent? User plan said Parent has pdfFilePath removed, but wait... 
            // The plan said "Update Letter with pdfFilePath". Let's check PaymentRequestLetter model. Yes, it has pdfFilePath.
            // But wait, the previous plan had it on PaymentRequest.
            // The NEW plan says "PaymentRequestLetter... pdfFilePath: String".
            // So we update the letter.
            letter.pdfFilePath = pdfPath;
            await letter.save();

        } catch (pdfError) {
            console.error('Error generating PDF:', pdfError);
        }

        // 7. Return Full Object
        const populatedRequest = await PaymentRequest.findById(paymentRequest._id)
            .populate('letter')
            .populate('voucher')
            .populate('documents')
            .populate('user', 'username email');

        res.status(201).json(populatedRequest);

    } catch (error) {
        console.error(error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: Object.values(error.errors).map(val => val.message).join(', ') });
        }
        res.status(500).json({ message: 'Server error creating request.' });
    }
};

const getRequests = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = { user: req.user.id };

        if (status) {
            query.status = status.includes(',') ? { $in: status.split(',') } : status;
        }

        if (search) {
             query.referenceNumber = { $regex: search, $options: 'i' };
        }

        const requests = await PaymentRequest.find(query)
            .populate('letter')
            .populate('voucher')
            .populate('documents')
            .populate('user', 'username')
            .populate('manager', 'username')
            .populate('history.actor', 'username')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching requests.' });
    }
};

const getRequestById = async (req, res) => {
    try {
        const request = await PaymentRequest.findById(req.params.id)
            .populate('letter')
            .populate('voucher')
            .populate('documents')
            .populate('user', 'username')
            .populate('manager', 'username')
            .populate('history.actor', 'username');

        if (!request) return res.status(404).json({ message: 'Request not found.' });

        // Access control
        if (request.user._id.toString() !== req.user.id && request.manager?._id.toString() !== req.user.id) {
             return res.status(403).json({ message: 'Not authorized to view this request.' });
        }

        res.json(request);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching request.' });
    }
};

const updateRequest = async (req, res) => {
    // This is complex with normalization. 
    // We update Parent status maybe? Or Voucher details?
    // User hasn't explicitly asked for Edit flow refactor yet, but simpler to just implement basic update
    // for Voucher/Letter if status is PENDING.
    // For now, let's keep it simple: strict updates to Voucher/Letter logic
    // But since the frontend uses this endpoint, we need it to work.
    
    try {
         const { id } = req.params;
         const updates = req.body;
         
         const request = await PaymentRequest.findById(id).populate('letter voucher');
         if (!request) return res.status(404).json({ message: "Request not found" });

         if (request.user.toString() !== req.user.id && request.manager?.toString() !== req.user.id) {
             return res.status(403).json({ message: "Not authorized" });
         }

         // Only Clerk can edit if PENDING_MANAGER or RETURNED_MANAGER
         if (request.user.toString() === req.user.id && !['PENDING_MANAGER', 'RETURNED_MANAGER'].includes(request.status)) {
             return res.status(400).json({ message: "Cannot edit request in current status" });
         }

         // Manager can edit if PENDING_MANAGER or RETURNED_ED
         if (request.manager?.toString() === req.user.id && !['PENDING_MANAGER', 'RETURNED_ED'].includes(request.status)) {
             return res.status(400).json({ message: "Manager cannot edit request in current status" });
         }

         // Update Voucher
         if (request.voucher) {
             // Map fields from body to voucher
             const voucherFields = ['beneficiary', 'amount', 'totalAmount', 'items', 'currency', 'amountInWords', 'bankName', 'accountNumber', 'accountName', 'fundingSourceCode', 'quickBooksCode', 'descriptionEn', 'descriptionFr'];
             voucherFields.forEach(field => {
                 if (updates[field] !== undefined) request.voucher[field] = updates[field];
             });
             await request.voucher.save();
         }

         // Update Letter
         if (request.letter && updates.paymentRequestBody) {
             request.letter.content = updates.paymentRequestBody;
             await request.letter.save();
             // Regenerate PDF? Probably should.
              try {
                const user = await User.findById(req.user.id);
                const pdfData = {
                    ...request.voucher.toObject(),
                    paymentRequestBody: request.letter.content,
                    referenceNumber: request.referenceNumber,
                    requestDate: request.createdAt,
                    _id: request._id
                };
                const pdfPath = await generateRequestPdf(pdfData, user.username);
                request.letter.pdfFilePath = pdfPath;
                await request.letter.save();
            } catch (e) { console.error("PDF Regeneration failed", e); }
         }

         // Documents handling (add new ones)
         if (req.files && req.files.length > 0) {
            const documents = req.files.map(file => ({
                paymentRequest: request._id,
                fileName: file.originalname,
                filePath: file.path,
                fileType: file.mimetype,
                fileSize: file.size,
                uploadedBy: req.user.id
            }));
            await SupportingDocument.insertMany(documents);
         }
         
         // Re-delete documents if requested? Not in scope yet.

         const updated = await PaymentRequest.findById(id)
            .populate('letter voucher documents user manager');
            
         res.json(updated);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Update failed" });
    }
};

const submitRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await PaymentRequest.findById(id);
        
        if (!request) return res.status(404).json({ message: "Request not found" });
        
        if (request.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Allow submission if DRAFT or RETURNED
        if (!['DRAFT', 'RETURNED_MANAGER', 'RETURNED_ED', 'PENDING_MANAGER'].includes(request.status)) {
            return res.status(400).json({ message: "Request is not in a submittable state" });
        }

        request.status = 'PENDING_MANAGER';
        request.history.push({
            action: 'SUBMITTED',
            actor: req.user.id,
            comment: 'Request submitted/re-submitted after updates'
        });

        await request.save();

        const populated = await PaymentRequest.findById(id)
            .populate('letter voucher documents user manager')
            .populate('history.actor', 'username');
            
        res.json(populated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Submission failed" });
    }
};

const getSubordinateRequests = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = { manager: req.user.id };

        if (status) query.status = status.includes(',') ? { $in: status.split(',') } : status;
        if (search) {
            query.referenceNumber = { $regex: search, $options: 'i' };
        }

        const requests = await PaymentRequest.find(query)
            .populate('letter')
            .populate('voucher')
            .populate('documents')
            .populate('user', 'username')
            .populate('history.actor', 'username')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error fetching subordinate requests" });
    }
};

const processRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, comment } = req.body;

        const request = await PaymentRequest.findById(id).populate('letter voucher');
        if (!request) return res.status(404).json({ message: "Request not found" });

        const user = await User.findById(req.user.id);
        
        // --- Manager Logic ---
        if (user.role === 'MANAGER') {
            if (request.manager?.toString() !== req.user.id) {
                return res.status(403).json({ message: "You are not the manager for this request" });
            }
            if (request.status !== 'PENDING_MANAGER' && request.status !== 'RETURNED_ED') {
                return res.status(400).json({ message: "Request is not in a state for manager action" });
            }

            if (action === 'APPROVE') {
                request.status = 'PENDING_ED';
            } else if (action === 'REJECT') {
                if (!comment) return res.status(400).json({ message: "Reason required for rejection" });
                request.status = 'REJECTED_MANAGER';
            } else if (action === 'RETURN') {
                if (!comment) return res.status(400).json({ message: "Comments required for returning to clerk" });
                request.status = 'RETURNED_MANAGER';
            } else {
                return res.status(400).json({ message: "Invalid action for manager" });
            }
        } 
        // --- ED Logic ---
        else if (user.role === 'ED') {
            if (request.status !== 'PENDING_ED') {
                return res.status(400).json({ message: "Request is not awaiting ED approval" });
            }

            if (action === 'APPROVE') {
                try {
                    if (request.letter && request.letter.pdfFilePath) {
                        await signAndLockPdf(request.letter.pdfFilePath, req.user.username);
                    }
                } catch (pdfError) {
                    console.error('Error signing PDF:', pdfError);
                }
                request.status = 'APPROVED';
            } else if (action === 'REJECT') {
                if (!comment) return res.status(400).json({ message: "Reason required for rejection" });
                request.status = 'REJECTED_ED';
            } else if (action === 'RETURN') {
                if (!comment) return res.status(400).json({ message: "Comments required for returning to manager" });
                request.status = 'RETURNED_ED';
            } else {
                return res.status(400).json({ message: "Invalid action for ED" });
            }
        } else {
            return res.status(403).json({ message: "Only Managers or ED can process requests" });
        }

        request.history.push({
            action: action === 'APPROVE' ? 'APPROVED' : (action === 'REJECT' ? 'REJECTED' : (user.role === 'MANAGER' ? 'RETURNED_MANAGER' : 'RETURNED_ED')),
            comment: comment,
            actor: req.user.id
        });

        await request.save();
        
        const updatedRequest = await PaymentRequest.findById(id).populate('letter voucher documents user');
        res.json(updatedRequest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error processing request" });
    }
};

const getEDRequests = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = { 
            status: status 
                ? (status.includes(',') ? { $in: status.split(',') } : status) 
                : { $in: ['PENDING_ED', 'RETURNED_ED'] } 
        };

        if (search) {
            query.referenceNumber = { $regex: search, $options: 'i' };
        }

        const requests = await PaymentRequest.find(query)
            .populate('letter')
            .populate('voucher')
            .populate('documents')
            .populate('user', 'username')
            .populate('manager', 'username')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error fetching ED requests" });
    }
};

module.exports = {
    createRequest,
    getRequests,
    getRequestById,
    updateRequest,
    submitRequest,
    getSubordinateRequests,
    processRequest,
    getEDRequests
};
