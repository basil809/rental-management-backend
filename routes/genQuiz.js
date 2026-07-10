const express = require('express');
const router = express.Router();
const genQuizController = require('../controllers/genQuizController');
const genQuiz = require('../models/genQuiz');
const authMiddleware = require('../middleware/authMiddleware');

// Creating a new genQuiz
router.post('/genQuiz', genQuizController.create);

// Admins can find all the questions asked by users
router.get('/genQuizes', authMiddleware, genQuizController.findAll);

// Admins can mark the question as answered
router.put('/:id', authMiddleware, genQuizController.Answered);

module.exports = router;