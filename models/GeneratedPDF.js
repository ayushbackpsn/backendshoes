const mongoose = require('mongoose');

const generatedPdfSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  filepath: {
    type: String,
    required: true
  },
  product_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  download_url: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GeneratedPDF', generatedPdfSchema);

