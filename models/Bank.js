const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  accounts: [{
    type: String
  }]
});

module.exports = mongoose.model('Bank', bankSchema);
