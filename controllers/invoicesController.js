const Invoice = require('../models/Invoice');

// Create invoice
exports.createInvoice = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const count = await Invoice.countDocuments({}) + 1;
    const paddedCount = String(count).padStart(5, '0'); // 00001, 00002, ...
    const invoiceId = `INV${year}-${paddedCount}`;

    const invoice = new Invoice({
      ...req.body,
      invoiceId // add invoiceId to invoice data
    });

    await invoice.save();
    res.status(201).json(invoice);
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ message: 'Server error creating invoice' });
  }
};


// Get all invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find();
    res.status(200).json(invoices);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ message: 'Server error fetching invoices' });
  }
};

// Get invoices for the logged-in tenant
exports.getInvoicesForTenant = async (req, res) => {
    try {
        const tenantId = req.user.id;
        console.log('Fetching invoices for tenant:', tenantId);

        const invoices = await Invoice.find({ tenant: tenantId }).sort({ dueDate: -1 });
        console.log('Invoices found:', invoices.length);

        res.json({ success: true, invoices });
    } catch (err) {
        console.error('Error fetching tenant invoices:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch invoices for tenant' });
    }
};


// ✅ Correct: Get invoice by ID
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.status(200).json(invoice);
  } catch (err) {
    console.error('Error fetching invoice by ID:', err);
    res.status(500).json({ message: 'Server error fetching invoice by ID' });
  }
};

// ✅ Correct: Get invoice count
exports.getInvoiceCount = async (req, res) => {
  try {

    // Get the current date and calculate the start of the month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    //Find all Invoices associated with the current month
    const InvoiceCount = await Invoice.find({
      createdAt: { 
        $gte: startOfMonth, 
        $lte: endOfMonth 
      }
    });

    if (!InvoiceCount || InvoiceCount.length === 0) {
      return res.status(200).json({ count: 0 });
    }

    const count = InvoiceCount.length;
    
    res.status(200).json({ count });
  } catch (err) {
    console.error('Error counting invoices:', err);
    res.status(500).json({ message: 'Server error counting invoices' });
  }
};

// ✅ get the total amounts from the all the invoices
exports.getPendingPayments = async (req, res) => {
  try {
    //Get the current date and calculate the start and end of the month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    //Find the invoices that are pending payment within the current month
    const invoices = await Invoice.find({
      updatedAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    })
    .sort({ updatedAt: -1 })
    .limit(10);
    
    const totalAmount = invoices.reduce((total, invoice) => total + invoice.amount, 0);
    res.status(200).json({ totalAmount });
  } catch (err) {
    console.error('Error fetching pending payments:', err);
    res.status(500).json({ message: 'Server error fetching pending payments' });
  }
};

// Update invoice
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.status(200).json(invoice);
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(500).json({ message: 'Server error updating invoice' });
  }
};

// Delete invoice
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    console.error('Error deleting invoice:', err);
    res.status(500).json({ message: 'Server error deleting invoice' });
  }
};

//Enable the landlord to delete an invoice
exports.deleteInvoice = async (req, res) => {
  try {
    if (req.user.userType !== 'Landlord') {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const { invoiceId } = req.params;

    const deleted = await Invoice.findByIdAndDelete(invoiceId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.status(200).json({ success: true, message: 'Invoice deleted successfully' });
  } catch (err) {
    console.error('Delete invoice error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};