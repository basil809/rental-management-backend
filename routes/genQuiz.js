const express = require('express');
const router = express.Router();
const genQuizController = require('../controllers/genQuizController');
const genQuiz = require('../models/genQuiz');
const Listing = require('../models/listings');
const authMiddleware = require('../middleware/authMiddleware');

// Creating a new genQuiz
router.post('/genQuiz', genQuizController.create);
// Creating a new property listing
router.post('/submit-advertise', genQuizController.submitAdvertise);
// Admins can find all the questions asked by users
router.get('/genQuizes', authMiddleware, genQuizController.findAll);
// Admins can find all the property listings submitted by users
router.get('/listings', authMiddleware, genQuizController.findAllListings);
// Admins can mark the question as answered
router.put('/:id', authMiddleware, genQuizController.Answered);

module.exports = router;