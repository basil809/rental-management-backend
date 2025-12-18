const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const maintenanceController = require('../controllers/maintainanceController');

// Tenant creates a request
router.post('/tenant', authMiddleware, maintenanceController.createRequest);

// Tenant views their own requests
router.get('/my', authMiddleware, maintenanceController.getTenantRequests);

// Admin or Landlord views all requests
router.get('/', authMiddleware, maintenanceController.getAllRequests);

// Admin or Landlord updates a request's status
router.put('/:requestId', authMiddleware, maintenanceController.updateRequestStatus);

// Tenant views their notifications
router.get('/notifications', authMiddleware, maintenanceController.getTenantNotifications);

// Tenant marks a notification as read
router.put('/notifications/:requestId', authMiddleware, maintenanceController.markRequestAsNotified);

// Count requests for logged-in tenant
router.get('/requests/count', authMiddleware, maintenanceController.getTenantRequestCount);

// Count all maintenance requests (for admin dashboard)
router.get('/open-count', authMiddleware, maintenanceController.getAllRequestCount);

//Get maintenance request completion rate
router.get('/completion-rate', authMiddleware, maintenanceController.getRequestCompletionRate);
module.exports = router;
