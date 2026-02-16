const mongoose = require('mongoose');

const paymentRequestLetterSchema = new mongoose.Schema({
  paymentRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentRequest',
    required: true
  },
  content: {
    type: String, // Rich text HTML
    required: true
  },
  pdfFilePath: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('PaymentRequestLetter', paymentRequestLetterSchema);
