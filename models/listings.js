// propert listing.js model
const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
    title: String,
    property_type: String,
    price: Number,
    location: String,
    size: Number,
    units: Number,
    bedrooms: Number,
    bathrooms: Number,
    Name: String,
    email: String,
    phone: String,
    description: String,
    images: [String],
    package: {
        type: String,
        enum: ['Standard Package', 'Medium Package', 'Premium Package'],
        default: 'Standard Package'
    },
   }, { timestamps: true });

module.exports = mongoose.model('Listing', listingSchema);