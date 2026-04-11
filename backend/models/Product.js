const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    compareAtPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1500,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    specs: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

productSchema.methods.toPublicObject = function toPublicObject() {
  return {
    id: this._id.toString(),
    slug: this.slug,
    name: this.name,
    category: this.category,
    price: this.price,
    compareAtPrice: this.compareAtPrice,
    rating: this.rating,
    stock: this.stock,
    image: this.image,
    summary: this.summary,
    description: this.description,
    featured: this.featured,
    specs: Object.fromEntries(this.specs || []),
  };
};

module.exports = mongoose.model('Product', productSchema);
