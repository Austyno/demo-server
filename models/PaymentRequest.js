const mongoose = require('mongoose');

const paymentRequestSchema = mongoose.Schema({
  referenceNumber: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING_MANAGER', 'PENDING_ED', 'APPROVED', 'REJECTED_MANAGER', 'REJECTED_ED', 'RETURNED_MANAGER', 'RETURNED_ED', 'PENDING', 'REJECTED', 'MINUTED'],
    default: 'PENDING_MANAGER'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  history: [{
    action: {
        type: String,
        enum: ['CREATED', 'APPROVED', 'REJECTED', 'REJECTED_MANAGER', 'REJECTED_ED', 'RETURNED_MANAGER', 'RETURNED_ED', 'EDITED', 'SUBMITTED']
    },
    comment: String,
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals to populate child documents
paymentRequestSchema.virtual('letter', {
  ref: 'PaymentRequestLetter',
  localField: '_id',
  foreignField: 'paymentRequest',
  justOne: true
});

paymentRequestSchema.virtual('voucher', {
  ref: 'PaymentVoucher',
  localField: '_id',
  foreignField: 'paymentRequest',
  justOne: true
});

paymentRequestSchema.virtual('documents', {
  ref: 'SupportingDocument',
  localField: '_id',
  foreignField: 'paymentRequest'
});

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
