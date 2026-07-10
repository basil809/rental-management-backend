//Controllers/genQuizController.js
const GenQuiz = require('../models/genQuiz');
const Admin = require('../models/admin');
const Listing = require('../models/listings');

//User asks a Question
exports.create = async (req, res) => {
    try {
        const { name, phone, email, message } = req.body;

            const genQuiz = new GenQuiz({
                name,
                phone,
                email,
                message,
            });
        
            await genQuiz.save();
        
            res.status(201).json({ message: 'Question sent successfully!' });
        } catch (error) {
        res.status(500).json({ message: 'Error submitting the question!', error: error.message });
    }
};

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

//Admins is able to find all the questions asked by the users
exports.findAll = async (req, res) => {
    try {
        const genQuiz = await GenQuiz.find({ status: 'Pending' })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            genQuiz
        });
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Server Error'
        });
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

//Admins is able to mark the question as answered
exports.Answered = async (req, res) => {
    try {
        const genQuiz = await GenQuiz.findById(req.params.id);
        if (!genQuiz) {
            return res.status(404).json({ message: 'Question not found' });
        }
        genQuiz.status = 'Answered';
        await genQuiz.save();
        res.status(200).json({ 
            success: true,
            message: 'Question marked as answered',
            data: genQuiz
         });
    } catch (error) {
        res.status(500).json({ message: 'Error marking the question as answered', error: error.message });
    }
};