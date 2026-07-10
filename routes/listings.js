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


module.exports = router;
