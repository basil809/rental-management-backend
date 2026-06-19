const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantsController');
const authMiddleware = require('../middleware/authMiddleware');
const Tenant = require('../models/tenants');
// ✅ Import centralized Cloudinary upload middleware
const upload = require('../middleware/uploadMiddle');

// ✅ Create tenant
router.post('/', tenantController.createTenant);

// ✅ Get tenant count
router.get('/count', async (req, res) => {
  try {
    const count = await Tenant.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Error getting tenant count' });
  }
});

// ✅ Login
router.post('/login', tenantController.loginTenant);

// ✅ Logout
router.post('/logout', authMiddleware, tenantController.logoutTenant);

// ✅ Authenticated tenant routes
router.get('/', authMiddleware, tenantController.getAllTenants);
router.get('/profile', authMiddleware, tenantController.getTenantProfile);
router.get('/billed/total', authMiddleware, tenantController.getTotalBilledAmount);
router.get('/balance', authMiddleware, tenantController.getTenantBalance);
router.get('/invoices', authMiddleware, tenantController.getTenantInvoices);
router.get('/invoices/count', authMiddleware, tenantController.getInvoiceCount);
router.get('/payments', authMiddleware, tenantController.getTenantPayments);

//Routes for getting all tenants payments with status to update the table for tenants records.
router.get('/latest', authMiddleware, tenantController.getLatestPayments);

// ✅ 🔄 Update tenant profile info + image from modal
router.post('/profile/update', authMiddleware, upload.single('image'), tenantController.updateTenantProfileFromModal);

// ✅ Routes with dynamic ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid tenant ID' });
  }
  return tenantController.getTenantById(req, res, next);
});

// ✅ Update tenant
router.put('/:id', authMiddleware, tenantController.updateTenant);

//✅ Update tenant via the landlord dashboard.
router.put('/tenants/:tenantId', authMiddleware, tenantController.updateTenant);

//✅ delete tenant
router.delete('/:id', authMiddleware, tenantController.deleteTenant);

//✅ delete tenant via the landlord dashboard.
router.delete('/tenants/:tenantId', authMiddleware, tenantController.deleteTenant);

module.exports = router;
