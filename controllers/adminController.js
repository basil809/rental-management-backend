//controllers/adminController.js
const Admin = require('../models/admin');
const Tenant = require('../models/tenants');

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

// DELETE: Admin deleting a tenant
exports.deleteTenantByAdmin = async (req, res) => {
  try {
    // 1. Extra safety check: Ensure the authMiddleware verified the user as an Admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: Only administrators can access this resource.' 
      });
    }

    const tenantId = req.params.id;
    const deletedTenant = await Tenant.findByIdAndDelete(tenantId);

    if (!deletedTenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Tenant successfully deleted by Administrator.' 
    });

  } catch (err) {
    console.error("Admin Delete Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};