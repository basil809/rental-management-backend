const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Message = require('../models/messages');
const Tenant = require('../models/tenants');
const Landlord = require('../models/landlords');
const Admin = require('../models/admin');

// ✅ [1] Tenant Inbox
router.get('/tenant', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.userType !== 'Tenant') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ sentAt: -1 });

    const conversationsMap = new Map();

    for (const msg of messages) {
      const otherUserId = 
      msg.senderId.toString() === userId 
      ? msg.receiverId.toString() 
      : msg.senderId.toString();

      if (!conversationsMap.has(otherUserId)) {
        // Detect whether the other user is a Landlord or Admin
        const userModel = 
        msg.senderId.toString() === userId 
        ? msg.receiverType === 'Landlord' 
          ? Landlord
          : Admin

        : msg.senderType === 'Landlord'
        ? Landlord
        : Admin;
        const participant = await userModel
        .findById(otherUserId)
        .select('_id name email image');

        conversationsMap.set(otherUserId, {
          participantId: participant?._id || otherUserId,
          participantName: participant?.name || participant?.email || 'User',
          participantImage:
            participant?.image || 'images/system Images/user (1).png',
          lastMessage: msg.content,
          lastTimestamp: msg.sentAt,
        });
      }
    }

    res.json({ 
      success: true, 
      conversations: Array.from(conversationsMap.values())
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// ✅ [2] Conversation thread
router.get('/conversation/:participantId', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const participantId = req.params.participantId;

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: participantId },
        { senderId: participantId, receiverId: currentUserId }
      ]
    }).sort({ sentAt: 1 });

    const formattedMessages = messages.map(msg => ({
      content: msg.content,
      timestamp: msg.sentAt,
      isSender: msg.senderId.toString() === currentUserId.toString()
    }));

    res.json({ success: true, messages: formattedMessages });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
  }
});

// ✅ [3] Reply to message
router.post('/reply', authMiddleware, async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({ success: false, message: 'Missing data' });
    }

    const newMessage = new Message({
      senderId: req.user.id,
      receiverId,
      senderType: req.user.userType,
      receiverType: req.user.userType === 'Tenant' ? 'Landlord' : 'Tenant',
      content: message,
      sentAt: new Date()
    });

    await newMessage.save();

    // 🔴 Emit real-time update
    const io = req.app.get('io');
    io.to(receiverId.toString()).emit('newMessage', {
      content: message,
      senderId: req.user.id,
      timestamp: newMessage.sentAt,
    });

    res.json({ success: true, message: 'Message sent successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
});

// ✅ [4] Compose message (Landlord ↔ Tenant + Admin Communication)
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { recipient, message } = req.body;

    if (!recipient || !message) {
      return res.status(400).json({ success: false, message: 'Recipient and message are required' });
    }

    let receiver = null;
    let receiverType = null;

    // ✅ Allow Tenant and Landlord to message Admin
    const admin = await Admin.findOne({
      $or: [{ username: recipient }, { email: recipient }]
    });

    // ✅ Tenant sending a message
    if (req.user.userType === 'Tenant') {
      // 1️⃣ Tenant → Landlord
      receiver =
        (await Landlord.findOne({ username: recipient })) ||
        (await Landlord.findOne({ email: recipient }));
      receiverType = 'Landlord';

      // 2️⃣ Tenant → Admin (if recipient is admin)
      if (!receiver && admin) {
        receiver = admin;
        receiverType = 'Admin';
      }
    }

    // ✅ Landlord sending a message
    else if (req.user.userType === 'Landlord') {
      // 1️⃣ Landlord → Tenant
      receiver =
        (await Tenant.findOne({ username: recipient })) ||
        (await Tenant.findOne({ email: recipient }));
      receiverType = 'Tenant';

      // 2️⃣ Landlord → Admin (if recipient is admin)
      if (!receiver && admin) {
        receiver = admin;
        receiverType = 'Admin';
      }
    }

    // ✅ Admin sending a message
    else if (req.user.userType === 'Admin') {
      // Admin → Tenant
      receiver =
        (await Tenant.findOne({ username: recipient })) ||
        (await Tenant.findOne({ email: recipient }));
      receiverType = 'Tenant';

      // Admin → Landlord
      if (!receiver) {
        receiver =
          (await Landlord.findOne({ username: recipient })) ||
          (await Landlord.findOne({ email: recipient }));
        receiverType = 'Landlord';
      }
    }

    // ❌ No receiver found
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    // ✅ Save message
    const newMessage = new Message({
      senderId: req.user.id,
      receiverId: receiver._id,
      senderType: req.user.userType,
      receiverType,
      content: message,
      sentAt: new Date()
    });

    await newMessage.save();

    // ✅ Real-time socket notification
    const io = req.app.get('io');
    io.to(receiver._id.toString()).emit('newMessage', {
      content: message,
      senderId: req.user.id,
      timestamp: newMessage.sentAt,
    });

    res.json({
      success: true,
      message: 'Message sent successfully',
      receiverId: receiver._id,
      receiverName: receiver.fullName || receiver.username || receiver.email
    });

  } catch (err) {
    console.error('Message send error:', err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});


// ✅ [5] Mark as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.read = true;
    await message.save();

    res.status(200).json({ message: 'Message marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update message', error });
  }
});

// ✅ [6] Landlord Inbox
router.get('/landlord', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.userType !== 'Landlord') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Find all messages for this landlord
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ sentAt: -1 });

    const conversationsMap = new Map();

    for (const msg of messages) {
      // Find the other participant in the conversation
      const otherUserId =
        msg.senderId.toString() === userId
          ? msg.receiverId.toString()
          : msg.senderId.toString();

      if (!conversationsMap.has(otherUserId)) {
        // Detect whether the other user is a Tenant or Landlord or Admin
        const userModel =
          msg.senderId.toString() === userId
            ? msg.receiverType === 'Tenant'
              ? Tenant
              : Landlord
            : msg.senderType === 'Tenant'
            ? Tenant
            : Landlord;

        const participant = await userModel
          .findById(otherUserId)
          .select('_id name email image');

        conversationsMap.set(otherUserId, {
          participantId: participant?._id || otherUserId,
          participantName: participant?.name || participant?.email || 'User',
          participantImage:
            participant?.image || 'images/system Images/user (1).png',
          lastMessage: msg.content,
          lastTimestamp: msg.sentAt,
        });
      }
    }

    res.json({
      success: true,
      conversations: Array.from(conversationsMap.values()),
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch landlord messages' });
  }
});
// ✅ [7] Admin Inbox
router.get('/Admin', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.user.id;

    //Find all Messages for the Admin
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ sentAt: -1 });

    const conversationsMap = new Map();

    for (const msg of messages) {
      //Find the other participant in the conversation
      const otherUserId = 
      msg.senderId.toString() === userId
      ? msg.receiverId.toString()
      : msg.senderId.toString();

      if (!conversationsMap.has(otherUserId)) {
        //Detect whether the other user is a Tenant Or landlord
        const userModel = 
          msg.senderId.toString() === userId
          ? msg.receiverType === 'Tenant'
            ? Tenant
            : Admin

          : msg.senderType === 'Tenant'
          ? Tenant
          :Admin;
        const participant = await userModel
         .findById(otherUserId)
         .select('_id name email image');
        
         conversationsMap.set(otherUserId, {
          participantId: participant?._id || otherUserId,
          participantName: participant?.name || participant?.email || 'User',
          participantImage:
            participant?.image || 'images/system Images/user (1).png',
          lastMessage: msg.content,
          lastTimestamp: msg.sentAt,
         });
      
      }
    }
    res.json({ 
      success: true, 
      conversations: Array.from(conversationsMap.values()) 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

module.exports = router;
