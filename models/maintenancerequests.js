const mongoose = require('mongoose');

const maintenanceRequestSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  tenantName: {
    type: String,
    required: true,
  },
  property: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  houseNumber: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Rejected', 'Resolved'],
    default: 'Pending',
  },
  RequestDate:{
    type: Date,
    required: true,
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
  },
  notified: {
  type: Boolean,
  default: false
}
});

const MaintenanceRequest = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);

module.exports = MaintenanceRequest;
