const mongoose = require('mongoose');

const genQuizSchema = new mongoose.Schema({
    name:  {
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
    status: {
        type: String,
        enum: ['Pending', 'Answered'],
        default: 'Pending',
    },
    DateAsked: {
        type: Date,
        default: Date.now
    }
});

const genQuizes = mongoose.model('GenQuizes', genQuizSchema);

module.exports = genQuizes;