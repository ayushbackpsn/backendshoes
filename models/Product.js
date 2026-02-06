const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  product_name: {
    type: String,
    required: true,
    trim: true
  },
  brand_name: {
    type: String,
    required: true,
    trim: true
  },
  brand_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  product_image: {
    type: String,
    required: false // Path to the image file (kept for backward compatibility)
  },
  product_images: {
    type: [String],
    default: [] // Array of paths to image files
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);

