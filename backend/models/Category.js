const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 80,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.methods.toPublicObject = function toPublicObject() {
  return {
    id: this._id.toString(),
    name: this.name,
  };
};

module.exports = mongoose.model('Category', categorySchema);
