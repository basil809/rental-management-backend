const mongoose = require('mongoose');

const pendingPaymentSchema = new mongoose.Schema({
  tenantName: { type: String, required: true },
  property: { type: String, required: true },
  roomNumber: { type: String, required: true },
  amountPaid: { type: Number, required: true },
  paymentMethod: { 
    type: String,
    enum: ['cash', 'credit card', 'Bank transfer', 'other'],
    default: 'cash', 
    required: true },
  paymentDate: { type: Date, default: Date.now },
  comment: { type: String },
  status: { type: String, default: "pending" }, // "pending", "confirmed", "rejected"
}, { timestamps: true });

module.exports = mongoose.model('PendingPayment', pendingPaymentSchema);
