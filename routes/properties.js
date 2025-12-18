// routes/properties.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const propertyController = require('../controllers/propertyController');
const authMiddleware = require('../middleware/authMiddleware');
const Tenant = require('../models/tenants');
const Property = require('../models/properties');

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/properties/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

//Fetching the recent properties for the index page
router.get('/recent', propertyController.getRecentProperties);

// Create a new property (with images)
router.post('/', authMiddleware, upload.array('images'), propertyController.createProperty);

// Count of properties (used in admin and landlord dashboard)
router.get('/count', propertyController.getPropertyCount);

//get the total number of units
router.get('/unoccupied', propertyController.getAvailableUnits);

//Get the total occupancy rate
router.get('/occupancy-rate', async (req, res) => {
  try {
    // Count number of tenants (1 tenant = 1 occupied unit)
    const tenantCount = await Tenant.countDocuments();

    // Sum total units from all properties using the `units` field
    const totalUnitsResult = await Property.aggregate([
      {
        $group: {
          _id: null,
          totalUnits: { $sum: "$units" }
        }
      }
    ]);

    const totalUnits = totalUnitsResult[0]?.totalUnits || 1; // Avoid divide by 0

    // Calculate occupancy rate
    const occupancyRate = Math.round((tenantCount / totalUnits) * 100);

    res.json({ occupancyRate });
  } catch (err) {
    console.error("Error calculating occupancy rate:", err);
    res.status(500).json({ error: "Failed to calculate occupancy rate" });
  }
});

// Get all properties
router.get('/', propertyController.getAllProperties);

// Get property by ID
router.get('/:id', propertyController.getPropertyById);

// Update property
router.put('/:id', authMiddleware, upload.array('images'), propertyController.updateProperty);

// Delete property
router.delete('/:id', authMiddleware, propertyController.deleteProperty);

// GET property by title
router.get('/by-title/:title', async (req, res) => {
    try {
        const property = await Property.findOne({ title: req.params.title });
        if (!property) return res.json({ success: false, message: 'Property not found' });

        res.json({ success: true, property });
    } catch (err) {
        console.error('Error fetching property:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
module.exports = router;
