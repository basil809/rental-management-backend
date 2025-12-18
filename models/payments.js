const mongoose = require('mongoose');
const Tenant = require('../models/tenants'); // Import Tenant model for balance updates

const paymentSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  tenantName: { type: String, required: true },
  property: { type: String, required: true },
  roomNumber: { type: String, required: true },
  amountPaid: { type: Number, required: true },
  date: { type: Date, required: true }, // the month this payment covers
  paymentDate: { type: Date, default: Date.now }, // actual time of recording
  paymentMethod: {
    type: String,
    enum: ['Mpesa', 'Bank Transfer', 'Cash', 'Credit Carry Forward'],
    default: 'Mpesa',
  },
  comment: { type: String, default: '' },
  actor: { type: String, default: 'Tenant' },
});

// ✅ Automatically update tenant balance after payment save
paymentSchema.post('save', async function (doc) {
  try {
    const tenant = await Tenant.findById(doc.tenant);
    if (!tenant) return;

    const rent = tenant.rent || 0;
    const startDate = tenant.leaseStartDate || tenant.createdAt || new Date();
    const now = new Date();

    const monthsElapsed =
      (now.getFullYear() - startDate.getFullYear()) * 12 +
      (now.getMonth() - startDate.getMonth()) +
      1;

    const totalRentDue = rent * monthsElapsed;

    // Prevent circular dependency issue
    const Payment = mongoose.model('Payment');
    const result = await Payment.aggregate([
      { $match: { tenant: tenant._id } },
      { $group: { _id: null, totalPaid: { $sum: '$amountPaid' } } },
    ]);

    const totalPaid = result[0]?.totalPaid || 0;
    const balance = totalRentDue - totalPaid;

    // ✅ Update tenant credit/arrears
    tenant.credit = balance < 0 ? Math.abs(balance) : 0;
    tenant.arrears = balance > 0 ? balance : 0;

    await tenant.save();
    console.log(`✅ Tenant ${tenant.tenantName || tenant._id} balance auto-updated.`);
  } catch (err) {
    console.error('❌ Error auto-updating tenant balance:', err);
  }
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
