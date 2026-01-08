import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
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
  gem_size: {
    type: String,
    required: true
  },
  details: {
    gemstone: { type: String, required: true },
    cut_type: { type: String },
    color: { type: String },
    clarity: { type: String }
  },

  more_information: {
    weight: { type: Number },
    origin: { type: String },
    treatment: { type: String },
    refractive_index: { type: String }
  },

  // Array of strings for color variations
  colors: [{
    type: String
  }],

  // Media Section
  primary_imgSrc: {
    type: String,
    required: true
  },
  imgs_src: [{
    type: String // Dynamic array for gallery/slider
  }],
  lab_test_img_src: {
    type: String
  },
  certificate_img_src: {
    type: String
  },
  tags: [{ type: String }]
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

const Product = mongoose.model('Product', productSchema);

export default Product;