// routes/invoices.js
const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoicesController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes are protected (admin or landlord login)
router.post('/', authMiddleware, invoiceController.createInvoice);

// Get invoice count (used in admin and landlord dashboard)
router.get('/count', invoiceController.getInvoiceCount);
router.get('/', authMiddleware, invoiceController.getAllInvoices);
//Get the payments for all invoices for the admin
router.get('/pending', authMiddleware, invoiceController.getPendingPayments)
// Get invoices for the logged-in tenant
router.get('/tenant', authMiddleware, invoiceController.getInvoicesForTenant);
router.get('/:id', authMiddleware, invoiceController.getInvoiceById);
router.put('/:id', authMiddleware, invoiceController.updateInvoice);
router.delete('/:id', authMiddleware, invoiceController.deleteInvoice);

module.exports = router;