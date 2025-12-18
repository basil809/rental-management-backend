// models/Invoice.js
const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceId: { type: String, required: true, unique: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }, // ✅ Add this
    tenantName: { type: String, required: true },
    property: { type: String, required: true },
    roomNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
    comment: { type: String, default: '' },
}, {
  timestamps: true
});

module.exports = mongoose.model('Invoice', invoiceSchema);
