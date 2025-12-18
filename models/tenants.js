const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  idNumber: { type: String, required: true },
  gender: { type: String, required: true },
  roomNumber: { type: String, required: true },
  rent: { type: Number, required: true }, // ✅ keep rent, not monthlyRent
  lease_start: { type: Date, required: true },
  property: { type: String, required: true },
  tenantID: { type: String, unique: true },
  password: { type: String },

  // ✅ For credits/overpayment handling
  credit: { type: Number, default: 0 }, // carry-forward balance
  arrears: { type: Number, default: 0 }, // current balance

  // ✅ Fields for edit/profile support
  Address: { type: String, default: '' },
  image: { type: String, default: '' } // path to uploaded profile image
}, { timestamps: true });

module.exports = mongoose.model('Tenant', tenantSchema);
