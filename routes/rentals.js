const express = require('express');
const router = express.Router();

const rentalsController = require('../controllers/rentalsController');
const authMiddleware = require('../middleware/authMiddleware');

console.log('rentalsController:', rentalsController);
console.log('authMiddleware:', authMiddleware);

router.post('/inquiry', rentalsController.create);
router.get('/inquiries', authMiddleware, rentalsController.getAllInquiries);
router.put('/:id', authMiddleware, rentalsController.updateStatus);

module.exports = router;