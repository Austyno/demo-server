const mongoose = require('mongoose');

const paymentVoucherSchema = new mongoose.Schema({
  paymentRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentRequest',
    // Making it optional as this form might be standalone or linked later
    required: false 
  },
  referenceNumber: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  
  beneficiary: { type: String, required: true },
  amountInWords: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'USD' }, // Defaulting to USD as per doc, but keeping flexible
  descriptionEn: { type: String },
  descriptionFr: { type: String },

  // Dynamic rows
  items: [{
    particulars: { type: String, required: true },
    amount: { type: Number, required: true },
    accountName: { type: String },
    fundingSourceCode: { type: String },
    quickBooksCode: { type: String }
  }],

  // Footer signatures
  preparedBy: { type: String },
  checkedBy: { type: String },
  authorizedBy: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('PaymentVoucher', paymentVoucherSchema);
