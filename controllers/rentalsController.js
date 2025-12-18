// Controllers/rentalsController.js
const Rental = require('../models/rentals');
const Property = require('../models/properties');
const Landlord = require('../models/landlords');

//User creates an inquiry
exports.create = async (req, res) => {
    try {
        const { name, phone, email, message, propertyId } = req.body;

        // Validate required fields
        if (!propertyId) {
            return res.status(400).json({ message: 'Property ID is required' });
        }

        const rental = new Rental({
            name,
            phone,
            email,
            message,
            propertyId: propertyId  // Assuming 'property' is the field in the schema
        });

        await rental.save();

        res.status(201).json({ message: 'Inquiry created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating inquiry', error: error.message });
    }
};

//code for displaying all the inquiries for the logged in landlord
exports.findAll = async (req, res) => {
  try {
    // ✅ Check if the user is a landlord
    if (req.user.userType !== 'Landlord') {
      return res.status(403).json({ message: 'Access denied! <br> Only Landlord can view all inquiries.' });
    }

    // ✅ Step 1: Get the property name of the logged-in landlord
    const landlord = await Landlord.findById(req.user._id).select('property');
    if (!landlord) {
      return res.status(404).json({ message: 'Landlord not found' });
    }

    // ✅ Step 2: Use the property name to find the property ID
    const property = await Property.findOne({ title: landlord.property }).select('_id name');
    if (!property) {
      return res.status(404).json({ message: 'Property not found for this landlord' });
    }

    // ✅ Step 3: Use the property ID to get all inquiries (from rentals collection)
    const inquiries = await Rental.find({ 
      propertyId: property._id,
      status: 'Pending'
     })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      property: property.name,
      inquiries
    });

  } catch (err) {
    console.error('Error fetching inquiries:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiries',
      error: err.message
    });
  }
};

//code to enable the landlord to make an inquiry as reached out
exports.reachedOut = async (req, res) => {
  if (req.user.userType !== 'Landlord') {
      return res.status(403).json({
        success: false,
        message: 'Only landlords or admins can update request status'
      });
    }

    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['Pending', 'ReachedOut'].includes(status)) {
        return res.status(400).json ({
          success: false,
          message: 'Invalid status value'
        });
      }

      const updateData = { status };
      if ( status === 'ReachedOut') {
        updateData.reachedOutAt = new Date();
      }

      const updatedInquiry = await Rental.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if(!updatedInquiry) {
        return res.status(404).json({
          success: false,
          message: 'Request not found'
        });
      }
       res.status(200).json({
      success: true,
      message: 'Request updated successfully',
      data: updatedInquiry
    });
  } catch (err) {
    console.error('Error updating request status:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  } 
};