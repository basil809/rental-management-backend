const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingsController');
const Listing = require('../models/listings');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddle');

// Creating a new property listing
router.post('/submit-advertise', upload.array('images', 10), listingController.submitAdvertise);

// Admins can find all the property listings submitted by users
router.get('/All-listings', authMiddleware, listingController.findAllListings);

// Admins can find a specific property listing by ID
router.get('/listing/:id', authMiddleware, listingController.findListingById);

// Admins can approve a property listing by converting it to a property in the properties collection
router.post('/approve-listing/:id', authMiddleware, listingController.approveListing);

// Admins can update a property listing
router.put('/update-listing/:id', authMiddleware, upload.array('images', 10), listingController.updateListing);

// Admins can delete a property listing
router.delete('/delete-listing/:id', authMiddleware, listingController.deleteListing);


module.exports = router;
