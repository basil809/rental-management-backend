const express = require('express');
const router = express.Router();
const rentalsController = require('../controllers/rentalsController');
const Rental = require('../models/rentals');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/inquiry', rentalsController.create);
router.get('/inquiries', authMiddleware, rentalsController.findAll);
router.put('/:id', authMiddleware, rentalsController.reachedOut);

module.exports = router;