const PaymentVoucher = require('../models/PaymentVoucher');
const Counter = require('../models/Counter');

// Generate next reference number
const getNextReferenceNumber = async (req, res) => {
    try {
        // Find and increment the counter for payment vouchers
        // If it doesn't exist, start at 100
        const counter = await Counter.findByIdAndUpdate(
            { _id: 'paymentVoucherId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // If newly created and default 0, set to 100 on first run? 
        // Actually, let's just ensure we start at 100 if seq is small.
        // But if upserted with default 0, increment makes it 1. 
        // Let's enforce the rule: start from 100.
        // If the seq is < 100, update it? Or just add 100?
        // User said "Start from 'Online-100'". 
        // Simplest way: Base ID is 100 + seq.
        
        let seqValue = counter.seq;
        if (seqValue < 100) {
           // This handling is a bit tricky if we want Strict "100" start. 
           // Let's re-logic:
           // If we want the first one to be 100.
           // We can just format it as 100 + seq if we start at 0.
           // But let's assume we want persistence.
           // If we just manually set the first one to 99 in DB, next is 100.
        }
        
        // Let's just use the logic: number = 99 + seq (if seq starts at 1)
        // Or cleaner: store the actual number in seq.
        // If we want to start at 100, we should initialize the counter to 99.
        // But `upsert` creates with default 0.
        
        // Better approach for safe "start at 100":
        if (seqValue === 1) {
             // It was just created and incremented to 1. Let's bump it to 100.
             await Counter.findByIdAndUpdate(
                { _id: 'paymentVoucherId' },
                { $set: { seq: 100 } }
            );
            seqValue = 100;
        }

        const referenceNumber = `Online-${seqValue}`;
        res.json({ referenceNumber });
    } catch (error) {
        console.error('Error creating reference number:', error);
        res.status(500).json({ message: 'Error generating reference number' });
    }
};

const createPaymentVoucher = async (req, res) => {
    try {
        const {
            referenceNumber,
            date,
            bankName,
            accountNumber,
            beneficiary,
            amountInWords,
            totalAmount,
            currency,
            items,
            preparedBy,
            checkedBy,
            authorizedBy
        } = req.body;

        const newVoucher = new PaymentVoucher({
            referenceNumber,
            date,
            bankName,
            accountNumber,
            beneficiary,
            amountInWords,
            totalAmount,
            currency,
            items,
            preparedBy,
            checkedBy,
            authorizedBy
        });

        const savedVoucher = await newVoucher.save();
        res.status(201).json(savedVoucher);
    } catch (error) {
        console.error('Error creating payment voucher:', error);
        res.status(500).json({ message: 'Error creating payment voucher', error: error.message });
    }
};

module.exports = {
    getNextReferenceNumber,
    createPaymentVoucher
};
