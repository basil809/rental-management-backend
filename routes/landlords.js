// routes/landlords.js
const express = require('express');
const router = express.Router();
const landlordController = require('../controllers/landlordController');
const tenantController = require('../controllers/tenantsController');
const invoiceController = require('../controllers/invoicesController');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const Landlord = require('../models/landlords');
const Tenant = require('../models/tenants');
const Property = require('../models/properties'); // ✅ import property model
const multer = require('multer');
const path = require('path');

// ✅ Configure Multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/landlords/'); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// ✅ POST: Create a landlord
router.post('/', landlordController.createLandlord);

// ✅ POST: Create new tenant
router.post('/new-tenant', landlordController.createTenant);

// ✅ GET: Count of landlords
router.get('/count', landlordController.getLandlordCount);

// ✅ GET: Landlord profile (must be before /:id)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const landlord = await landlordController.getLandlordByIdFromAuth(req.user.id);
    if (!landlord) return res.status(404).json({ success: false, message: 'Landlord not found' });
    res.json({ success: true, landlord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch landlord profile' });
  }
});

// ✅ 🔄 Update tenant profile info + image from modal
router.post('/profile/update', authMiddleware, upload.single('image'), landlordController.updateLandlordProfileFromModal);

// ✅ NEW: GET landlord dashboard info (landlord + property)
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Landlord') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get logged-in landlord
    const landlord = await Landlord.findById(req.user._id);
    if (!landlord) {
      return res.status(404).json({ success: false, message: 'Landlord not found' });
    }

    // Match by title instead of property
    const property = await Property.findOne({ title: landlord.property });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Respond with landlord and property info
    res.json({
      success: true,
      landlord: {
        name: landlord.name,
        email: landlord.email,
        phone: landlord.phone,
        property: landlord.property
      },
      property: {
        title: property.title,
        location: property.location,
        price: property.price,
        size: property.size,
        description: property.description,
        units: property.units,
        images: property.images
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ Landlord logout
router.post('/logout', authMiddleware, landlordController.logoutLandlord);
// GET landlord properties and unoccupied units
// GET landlord property & vacant units
router.get('/properties', authMiddleware, async (req, res) => {
    try {
        // 1️⃣ Find the logged-in landlord
        const landlord = await Landlord.findById(req.user.id);
        if (!landlord) {
            return res.status(404).json({ success: false, message: 'Landlord not found' });
        }

        // 2️⃣ Find the property by the name stored in landlord.property
        const property = await Property.findOne({ title: landlord.property });
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        // 3️⃣ Find all tenants in this property
        const occupiedTenants = await Tenant.find({ property: property.title }).select('roomNumber');
        const occupiedRooms = occupiedTenants.map(t => t.roomNumber);

        // 4️⃣ Filter out the occupied units
        const vacantUnits = property.unitNames.filter(unit => !occupiedRooms.includes(unit));

        // 5️⃣ Send the data back
        res.json({
            success: true,
            data: {
                property: property.title,
                price: property.price,
                vacantUnits
            }
        });

    } catch (error) {
        console.error('Error fetching landlord property and units:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ✅ NEW: PUT to update unit count
router.put('/update-units', authMiddleware, async (req, res) => {
  const { newUnits } = req.body;

  try {
    if (req.user.role !== 'Landlord') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const landlord = await Landlord.findById(req.user._id);
    if (!landlord) return res.status(404).json({ success: false, message: 'Landlord not found' });

    const property = await Property.findOne({ property: landlord.property });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    property.units = newUnits;
    await property.save();

    res.json({ success: true, message: 'Units updated successfully' });
  } catch (err) {
    console.error('Update units error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ POST: New payment
router.post('/payments', authMiddleware, landlordController.makePayment);

// ✅ create Invoice
router.post('/new-invoice', authMiddleware, landlordController.createInvoice);

// ✅ code to calculate the total-balance rent for the landlord's property
router.get('/tenant-balance', authMiddleware, landlordController.getTenantBalance);

// ✅ count the number of tenants
router.get('/tenant-count', authMiddleware, landlordController.countTenantsInProperty);

// ✅ Count  all the invoices sent to landlord's tenants
router.get('/invoice-count', authMiddleware, landlordController.countInvoicesSentToTenants);

// ✅ GET: All landlords
router.get('/', authMiddleware, landlordController.getAllLandlords);

// ✅ GET: All tenants by landlord property
router.get('/tenants', authMiddleware, landlordController.getTenantsByProperty);

// ✅ GET: All payments by landlord
router.get('/payments', authMiddleware, landlordController.getPaymentsByProperty);

// ✅ GET: calcutaing all the payments received by landlord
router.get('/payment-received', authMiddleware, landlordController.calculateTotalAmountReceived);

// ✅ GET: Rentable units for landlord
router.get('/rentable-units', authMiddleware, landlordController.getRentableUnits);

//✅ count the number of maintenance requests 
router.get('/maintenance-count', authMiddleware, landlordController.countMaintenanceRequestsByLandlord);

// ✅ count the number of payments 
router.get('/payment-count', authMiddleware, landlordController.countPaymentsReceivedByLandlord);

// ✅ GET: All invoices by landlord
router.get('/invoices', authMiddleware, landlordController.getInvoicesByProperty);

// ✅ GET: Get pending payments via invoices
router.get('/pending-payments', authMiddleware, landlordController.calculateTenantBalance);

// ✅ GET: One landlord by ID
router.get('/:id', authMiddleware, landlordController.getLandlordById);

// ✅ PUT: Update landlord by ID
router.put('/:id', authMiddleware, landlordController.updateLandlord);

// ✅ PUT: Update tenant via landlord dashboard
router.put('/tenants/:id', landlordController.updateTenant);

// ✅ DELETE: Remove landlord
router.delete('/:id', authMiddleware, landlordController.deleteLandlord);

// ✅ DELETE: Remove tenant
router.delete('/tenants/:tenantId', authMiddleware, tenantController.deleteTenant);

// ✅ DELETE: Remove invoice
router.delete('/invoices/:invoiceId', authMiddleware, invoiceController.deleteInvoice);

module.exports = router;
