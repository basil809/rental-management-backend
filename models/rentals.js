const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'ReachedOut'],
        default: 'Pending',
    },

    name: {
        type: String,
        required: true,
    },

    phone: {
        type: String,
        required: true,
    },

    email: {
        type: String,
        required: true,
    },

    message: {
        type: String,
        required: true,
    },

    inquiryDate: {
        type: Date,
        default: Date.now
    },
    reachedOutAt: {
        type: Date,
    }
});

const Rentals = mongoose.model('Rentals', rentalSchema);

module.exports = Rentals;