const Message = require('../models/messages');
const Landlord = require('../models/landlords');
const Tenant = require('../models/tenants');
const Admin = require('../models/admin');

// GET /messages
exports.getMessagesForUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.user.role; // 'Tenant' or 'Landlord'

    // 1️⃣ Find all messages involving the logged-in user
    const messages = await Message.find({
      $or: [
        { senderId: userId, senderType: userType },
        { receiverId: userId, receiverType: userType }
      ]
    }).sort({ sentAt: -1 });

    // 2️⃣ Collect all other participant IDs
    const participants = [];
    messages.forEach(msg => {
      if (msg.senderId.toString() !== userId.toString()) {
        participants.push(msg.senderId);
      } else if (msg.receiverId.toString() !== userId.toString()) {
        participants.push(msg.receiverId);
      }
    });

    // 3️⃣ Fetch participant details from Tenants & Landlords
    const tenants = await Tenant.find({ _id: { $in: participants } })
      .select("_id name image");
    const landlords = await Landlord.find({ _id: { $in: participants } })
      .select("_id name image");
    const admins = await Admin.find({ _id: { $in: participants } })
      .select("_id username profileImage");
      
    // 4️⃣ Build a lookup map for participants
    const participantMap = {};
    [...tenants, ...landlords, ...admins].forEach(p => {
      participantMap[p._id] = {
        participantId: p._id,
        participantName: p.name,
        participantImage: p.image || null
      };
    });

    // 5️⃣ Format the messages to match frontend expectations
    const formattedMessages = messages.map(msg => {
      const otherId =
        msg.senderId.toString() === userId.toString()
          ? msg.receiverId
          : msg.senderId;

      return {
        participantId: otherId,
        participantName: participantMap[otherId]?.participantName || "Unknown",
        participantImage:
          participantMap[otherId]?.participantImage ||
          "images/system Images/user (1).png",
        lastMessage: msg.content,
      };
    });

    res.status(200).json(formattedMessages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages", error });
  }
};



// POST /messages
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, receiverType, content } = req.body;

    const newMessage = new Message({
      senderId: req.user._id,
      senderType: req.user.role,
      receiverId,
      receiverType,
      content,
    });

    const savedMessage = await newMessage.save();

    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error });
  }
};

// PATCH /messages/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.read = true;
    await message.save();

    res.status(200).json({ message: 'Message marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update message', error });
  }
};
