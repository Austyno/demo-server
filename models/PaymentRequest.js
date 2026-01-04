const mongoose = require('mongoose');

const paymentRequestSchema = mongoose.Schema({
  descriptionEn: {
    type: String,
    required: true
  },
  descriptionFr: {
    type: String,
    required: true
  },
  beneficiary: String,
  bankName: String,
  accountNumber: String,
  referenceNumber: String,
  amount: Number,
  currency: {
    type: String,
    default: 'USD'
  },
  amountInWords: String,
  accountName: String, // Budget Line
  fundingSourceCode: String,
  quickBooksCode: String,
  requestDate: Date,
  status: {
    type: String,
    required: true,
    enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'MINUTED'],
    default: 'DRAFT'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  documents: [{
    filePath: String,
    originalName: String
  }],
  history: [{
    action: String, // SUBMIT, APPROVE, REJECT, MINUTE
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
  timestamps: true
});

const PaymentRequest = mongoose.model('PaymentRequest', paymentRequestSchema);

module.exports = PaymentRequest;
