const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderType',
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'receiverType',
  },
  senderType: {
    type: String,
    required: true,
    enum: ['Tenant', 'Landlord', 'Admin'],
  },
  receiverType: {
    type: String,
    required: true,
    enum: ['Tenant', 'Landlord', 'Admin'],
  },
  content: {
    type: String,
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
