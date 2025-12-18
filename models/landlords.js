const mongoose = require('mongoose');

const landlordSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
  },
  idNumber: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  property: {           // Changed from propertyId to just property
    type: String,
    required: true,
  },
  password: {
    type: String 
  },
  image: { 
    type: String,
    default: '' 
  }, // path to uploaded profile image
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Landlord = mongoose.model('Landlord', landlordSchema);

module.exports = Landlord;