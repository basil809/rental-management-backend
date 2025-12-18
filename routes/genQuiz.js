const express = require('express');
const router = express.Router();
const genQuizController = require('../controllers/genQuizController');
const genQuiz = require('../models/genQuiz');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/genQuiz', genQuizController.create);
router.get('/genQuizes', authMiddleware, genQuizController.findAll);
router.put('/:id', authMiddleware, genQuizController.Answered);

module.exports = router;