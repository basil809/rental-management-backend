const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ Tenant submits payment for review
router.post('/reviewPayments', authMiddleware, reviewController.submitReview);

// ✅ Admin views all review payments
router.get('/', authMiddleware, reviewController.getAllReviews);

// ✅ Landlord views all review payments from his tenants
// ✅ Landlord confirms/rejects payment
router.get('/pending', authMiddleware, reviewController.getPaymentsForLandlord);

// ✅ Approve/reject routes By Landlord
router.put('/approve/:id', authMiddleware, reviewController.approvePayment);
router.put('/reject/:id', authMiddleware, reviewController.rejectPayment);

//✅ Tenant views  their notifications
router.get('/notification', authMiddleware, reviewController.getTenantNotifications);

//✅ Tenant marks a notification as read
router.put('/notification/:id', authMiddleware, reviewController.markNotificationAsRead);

//✅ Tenant checks status of payment
router.get('/payment-status', authMiddleware, reviewController.getTenantPaymentStatus);

// ✅ Admin/Landlord updates review status
router.put('/:id', authMiddleware, reviewController.updateReviewStatus);

module.exports = router;
