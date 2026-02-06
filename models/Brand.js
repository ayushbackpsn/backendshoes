const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  brand_name: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Brand', brandSchema);

