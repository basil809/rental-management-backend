const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  event: { type: String, required: true },          // e.g. "Tenant Balance Update"
  status: { type: String, enum: ['Success', 'Error', 'Pending'], required: true },
  message: { type: String },                        // short description or error message
  timestamp: { type: Date, default: Date.now }      // auto time of logging
});

module.exports = mongoose.model('SystemLog', systemLogSchema);
