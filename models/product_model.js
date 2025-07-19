const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  size: [{
    type: String
  }],
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
  },
  originalPrice: {
    type: Number,
    required: true
  },
  salePrice: {
    type: Number
  },
  images: [{
    type: String
  }],
  description: {
    type: String
  },
  salesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save hook to generate slug from title if not provided
productSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
