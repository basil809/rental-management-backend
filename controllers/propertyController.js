// controllers/propertyController.js
const Property = require('../models/properties');
const Tenant = require('../models/tenants');
const path = require('path');
const fs = require('fs');

// CREATE: Add a new property
exports.createProperty = async (req, res) => {
  try {
    // Handle image paths from multer
    const imagePaths = req.files.map(file => file.path);

    const {
      title,
      property_type,
      price,
      location,
      units,
      bedrooms,
      bathrooms,
      landlord,
      email,
      phone,
      size,
      description,
      unitNames, // optional from Apartment form
    } = req.body;

    // Validation check (basic)
    if (!title || !property_type || !price || !location || !size || !description) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    // Initialize new property object
    const newProperty = new Property({
      title,
      property_type,
      price,
      location,
      units,
      bedrooms,
      bathrooms,
      landlord,
      email,
      phone,
      size,
      description,
      images: imagePaths,
    });

    // If unitNames is present (e.g., for Apartments), parse and add it
    if (unitNames) {
      try {
        newProperty.unitNames = JSON.parse(unitNames);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid unitNames format.' });
      }
    }

    // Save to DB
    await newProperty.save();
    return res.status(201).json({ message: 'Property added successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'An error occurred while saving the property.' });
  }
};


// READ: Get all properties
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find({});
    console.log('Properties found:', properties.length);
    res.json(properties);

  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch properties.' });
  }
};

// Fetching the recent properties for the index page
exports.getRecentProperties = async (req, res) => {
  try {
    const properties = await Property.find()
      .sort({ createdAt: -1 })
      .limit(3); // Fetching the latest 3 properties
    res.status(200).json(properties);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch properties.' });
  }
};

// READ: Get property by ID
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }
    res.status(200).json(property);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch property.' });
  }
};

// COUNT: Get total property count
exports.getPropertyCount = async (req, res) => {
  try {
    const count = await Property.countDocuments();
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Error counting properties.' });
  }
};

//COUNT: Get total UNITS count
exports.getAvailableUnits = async (req, res) => {
  try {
    // Step 1: Get total units (sum of 'units' from all properties)
    const totalUnitsResult = await Property.aggregate([
      {
        $group: {
          _id: null,
          totalUnits: { $sum: "$units" } // Sum all 'units' values
        }
      }
    ]);

    const totalUnits = totalUnitsResult[0]?.totalUnits || 0;

    // Step 2: Get occupied units (count of tenants)
    const occupiedUnits = await Tenant.countDocuments({});

    // Step 3: Calculate available units
    const availableUnits = totalUnits - occupiedUnits;

    // Step 4: Return results
    res.status(200).json({
      success: true,
      totalUnits,
      occupiedUnits,
      availableUnits
    });

  } catch (err) {
    console.error('Error fetching unit data:', err);
    res.status(500).json({ message: 'Server error fetching unit data' });
  }
};

// UPDATE: Update property
exports.updateProperty = async (req, res) => {
  try {
    const imagePaths = req.files?.map(file => file.path) || [];
    const updatedData = { ...req.body };

    if (imagePaths.length > 0) {
      updatedData.images = imagePaths;
    }

    const updated = await Property.findByIdAndUpdate(req.params.id, updatedData, { new: true });

    if (!updated) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    res.status(200).json({ message: 'Property updated successfully!', property: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update property.' });
  }
};

// DELETE: Delete property
exports.deleteProperty = async (req, res) => {
  try {
    const deleted = await Property.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Optionally remove associated images from the filesystem
    deleted.images.forEach(imagePath => {
      fs.unlink(imagePath, err => {
        if (err) console.error(`Failed to delete image ${imagePath}:`, err);
      });
    });

    res.status(200).json({ message: 'Property deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete property.' });
  }
};