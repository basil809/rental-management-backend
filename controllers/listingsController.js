const Listing = require('../models/listings');
const Admin = require('../models/admin');

//User submits a property listing
exports.submitAdvertise = async (req, res) => {
    try {
        const imagePaths = req.files ? req.files.map(file => file.path || file.secure_url || file.cloudinaryUrl || '') : [];

        console.log("Extracted Image Paths to save in DB:", imagePaths);
    
        const {
            title, 
            property_type, 
            price, 
            location, 
            size, 
            units, 
            bedrooms, 
            bathrooms, 
            package, 
            Name, 
            email, 
            phone, 
            description 
        } = req.body;
        
        const listing = new Listing({
            title,
            property_type,
            price,
            location,
            size,
            units,
            bedrooms,
            bathrooms,
            package,
            Name,
            email,
            phone,
            description,
            images: imagePaths, // Will now contain actual URL strings!
        });

        await listing.save();
        res.status(201).json({ message: 'Property listing submitted successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting the property listing!', error: error.message });
    }
};

// Admins can find all the property listings submitted by users
exports.findAllListings = async (req, res) => {
    try {
        // ✅ Get page & limit from query (defaults to 1 & 20)
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        // ✅ Count total Listings (for pagination)
        const totalListings = await Listing.countDocuments();

        // ✅ Get Listings for this page only
        const listings = await Listing.find().skip(skip).limit(limit);

        res.json({
            success: true,
            listings,
            pagination: {
                totalListings,
                totalPages: Math.ceil(totalListings / limit),
                currentPage: page,
                hasNextPage: page < Math.ceil(totalListings / limit),
                hasPrevPage: page > 1,
            },
        });
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
