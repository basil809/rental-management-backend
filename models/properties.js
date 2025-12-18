const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: String,
  property_type: String,
  price: Number,
  location: String,
  size: Number,
  units: Number,
  bedrooms: Number,
  bathrooms: Number,
  landlord: String,
  email: String,
  phone: String,
  description: String,
  images: [String],

  // New field to store generated unit names (for Apartments)
  unitNames: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);

