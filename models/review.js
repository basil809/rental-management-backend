const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    invoiceID:{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    tenantName: { type: String, required: true },
    tenantID: { type: String, required: true },
    phone: { type: String, required: true },
    property: { type: String, required: true },
    roomNumber: { type: String, required: true },
    amountPaid: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Bank Transfer', 'Cash'], required: true },
    invoiceId: { type: String, required: true },
    datePaid: { type: Date, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    rejectionReason: { type: String, default: '' },
    notified: { type: Boolean, default: false },
    rejectedAt: { type: Date, default: ''},
}, {
    timestamps: true
});

module.exports = mongoose.model('Review', reviewSchema);
