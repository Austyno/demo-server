const mongoose = require('mongoose');

const chartOfAccountSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String
  },
  isSub: {
    type: Boolean,
    default: false
  },
  parentCode: {
    type: String
  },
  full_name: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('ChartOfAccount', chartOfAccountSchema);
