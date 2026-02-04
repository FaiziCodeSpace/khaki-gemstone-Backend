import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const productSchema = new mongoose.Schema({
  productNumber: {
    type: String,
    unique: true,
    default: () => `GEM-${uuidv4().split('-')[0].toUpperCase()}`
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  gem_size: String,

  details: {
    gemstone: { type: String, required: true },
    cut_type: String,
    color: String,
    clarity: String
  },

  more_information: {
    weight: Number,
    origin: String,
    treatment: String,
    refractive_index: String
  },

  profitMargin: {
    type: Number,
    min: 0,
    default: null
  },
  profitSharingModel: {
    type: Number,
    min: 0,
    default: null
  },
  status: {
    type: String,
    enum: ["Available", "Sold", "Pending", "For Sale"],
    default: "Available",
    index: true
  },
  portal: {
    type: String,
    enum: ["PUBLIC", "INVESTOR", "PUBLIC BY INVESTED"],
    index: true
  },

  location: {
    type: String,
    trim: true,
    required: true
  },

  isLimitedProduct: {
    type: Boolean,
    default: true
  },

  imgs_src: [String],
  lab_test_img_src: String,
  certificate_img_src: String,

  isActive: { type: Boolean, default: true },
  tags: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.virtual('profitEstimate').get(function () {
  if (
    this.portal !== 'INVESTOR' ||
    this.profitMargin === null ||
    this.price == null
  ) {
    return null;
  }

  return Number((this.price * (this.profitMargin / 100)).toFixed(2));
});

const Product = mongoose.model('Product', productSchema);

export default Product;