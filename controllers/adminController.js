//controllers/adminController.js
const Admin = require('../models/admin');

// ✅ Get Admin by ID (for profile)
exports.getAdminByIdAuth = async (userId) => {
  try {
    const admin = await Admin.findById(userId).select('-password');
    return admin;
    } catch (error) {
        console.error('Error fetching admin by ID:', error);
        return null;
    }
};