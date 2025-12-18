const Tenant = require('../models/tenants');
const Payment = require('../models/payments');
const Invoice = require('../models/Invoice');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // For password generation
const { v4: uuidv4 } = require('uuid'); // For tenant ID
require('dotenv').config();
const bcrypt = require('bcrypt');

exports.createTenant = async (req, res) => {
    try {
        const {
            name, email, phone, idNumber, gender, roomNumber,
            rent, lease_start, property
        } = req.body;

        // ✅ Check if roomNumber is already occupied in that property
        const existingTenant = await Tenant.findOne({ property, roomNumber });
        if (existingTenant) {
            return res.status(400).json({
                message: `Room ${roomNumber} is already occupied in the selected property.`
            });
        }

        // Generate Tenant ID and Password
        const tenantID = uuidv4().split('-')[0]; // e.g., 'a1b2c3d4'
        const plainPassword = crypto.randomBytes(4).toString('hex'); // e.g., '8f4a9d3c'
        const hashedPassword = await bcrypt.hash(plainPassword, 10); // ✅ moved here

        const tenant = new Tenant({
            name,
            email,
            phone,
            idNumber,
            gender,
            roomNumber,
            rent,
            lease_start,
            property,
            tenantID,
            password: hashedPassword
        });

        await tenant.save();

        //send emial with credentials
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome to La Maison Rental System',
            html: `
                <p>Dear ${name},</p>
                <p>Your tenant account has been created successfully.</p>
                <p><strong>Tenant ID:</strong> ${tenantID}</p>
                <p><strong>Password:</strong> ${plainPassword}</p>
                <p>Use these credentials to log in to your dashboard.</p>
                <p>Regards,<br>La Maison Management Team</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ message: 'Tenant created and email sent successfully' });

    } catch (err) {
        console.error('Tenant creation error:', err);
        res.status(500).json({ message: 'Something went wrong' });
    }
};

// COUNT:: Get the total number of tenants
exports.countTenants = async (req, res) => {
    try {
        const count = await Tenant.countDocuments();
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find();
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTenantById = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//PUT: Update a tenant by ID
exports.updateTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(tenant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE: Delete a tenant by ID
exports.deleteTenant = async (req, res) => {
  try {
    await Tenant.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tenant deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LOGIN: Tenant login and JWT token issuance
exports.loginTenant = async (req, res) => {
  const { tenantID, password } = req.body;

  try {
    const tenant = await Tenant.findOne({ tenantID });

    if (!tenant) {
      return res.status(401).json({ message: 'Invalid tenant ID or password' });
    }

    const isMatch = await bcrypt.compare(password, tenant.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid tenant ID or password' });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: tenant._id }, process.env.JWT_SECRET || 'n9&Lk!zP2x@Qe7#rV8sWf$uT0&jD', {
      expiresIn: '1d'
    });

    res.cookie('token', token, { httpOnly: true });
    res.json({ success: true, message: 'Login successful' });

  } catch (err) {
    console.error('Tenant login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// LOGOUT: Tenant logout by clearing the JWT cookie
exports.logoutTenant = async (req, res) => {
  try {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logout successful' });
  }
  catch (err) {
    console.error('Tenant logout error:', err);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

// ✅ Get tenant's profile
exports.getTenantProfile = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user._id).select('-password');

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    res.json({ success: true, tenant }); // ✅ Match frontend expectation
  } catch (err) {
    console.error('Error in getTenantProfile:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Calculating tenant's balance with carry-forward (using tenant _id)
exports.getTenantBalance = async (req, res) => {
  try {
    // Find tenant by logged-in user's ID
    const tenant = await Tenant.findById(req.user._id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const rent = tenant.rent || 0;
    const { leaseStartDate } = tenant;

    // ✅ Sum ALL payments for this tenant by _id
    const result = await Payment.aggregate([
      {
        $match: {
          tenant: tenant._id
        }
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$amountPaid' }
        }
      }
    ]);

    const totalPaid = result[0]?.totalPaid || 0;

    // ✅ Calculate months since lease started
    const startDate = leaseStartDate || tenant.createdAt || new Date();
    const now = new Date();
    const monthsElapsed =
      (now.getFullYear() - startDate.getFullYear()) * 12 +
      (now.getMonth() - startDate.getMonth()) +
      1;

    const totalRentDue = rent * monthsElapsed;

    // ✅ Balance: Positive = owes, Negative = overpaid
    const balance = totalRentDue - totalPaid;

    // 🔥 Save credit/arrears in tenant doc
    tenant.credit = balance < 0 ? Math.abs(balance) : 0;   // store overpaid as credit
    tenant.arrears = balance > 0 ? balance : 0;           // store underpaid as arrears
    await tenant.save();

    res.json({
      success: true,
      rent,
      monthsElapsed,
      paid: totalPaid,
      totalRentDue,
      balance,
      status: balance > 0 ? "Owes Rent" : balance < 0 ? "Overpaid" : "Settled",
    });
  } catch (error) {
    console.error("Error calculating tenant balance:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get total amount paid by tenant (all-time)
//So this code, I have opted use the Id_ to find the tenant instead of using the name. 
// This is because the name might be changed in the future, 
// and using the Id_ will ensure that the correct tenant is being referenced. 
// Additionally, I have added a check to ensure that the tenant exists before attempting to calculate the total amount paid.
exports.getTotalBilledAmount = async (req, res) => {
  try {
    // Find tenant by logged-in user ID
    const tenant = await Tenant.findById(req.user._id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Use tenant._id to match payments
    const result = await Payment.aggregate([
      {
        $match: {
          tenant: tenant._id
        }
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$amountPaid' }
        }
      }
    ]);

    const totalPaid = result.length > 0 ? result[0].totalPaid : 0;

    res.json({
      success: true,
      totalBilled: totalPaid
    });
  } catch (err) {
    console.error('Error fetching total billed amount:', err);
    res.status(500).json({ message: 'Error calculating total billed amount' });
  }
};

//code for counting the number of invoices the tenant has
exports.getInvoiceCount = async (req, res) => {
  try {
    //Find tenant by logged-in user ID
    const tenant = await Tenant.findById(req.user._id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const count = await Invoice.countDocuments({
      tenant: tenant._id // filter by logged-in tenant
    });

    res.json({ success: true, count });
  } catch (err) {
    console.error('Error counting invoices:', err);
    res.status(500).json({ message: 'Error counting invoices' });
  }
};

//code for enabling the tenant to view their payment history
// Get latest payments
exports.getLatestPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ tenant: req.user._id }) // filter by logged-in tenant
      .sort({ paymentDate: -1 })
      .limit(10);

    const transactions = payments.map(payment => ({
      actor: payment.actor,
      description: `You paid Ksh. ${payment.amountPaid.toLocaleString()} for ${payment.property}, Room ${payment.roomNumber}`,
      time: payment.paymentDate.toISOString().replace('T', ' : ').split('.')[0]
    }));

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching latest payments:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

//getting payments made by the tenant.
exports.getTenantPayments = async (req, res) => {
  try {
    // Find tenant by the logged-in user's ID
    const tenant = await Tenant.findById(req.user._id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Find all payments tied to this tenant's ID
    const payments = await Payment.find({
      tenant: tenant._id
    }).sort({ paymentDate: -1 });

    res.json({ success: true, payments });
  } catch (err) {
    console.error('Error fetching tenant payments:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// 🔄 Update tenant info (name, email, phone, address) + image from modal
exports.updateTenantProfileFromModal = async (req, res) => {
  try {
    const tenantId = req.user._id;
    const { name, email, phone, address } = req.body;

    // Build update object
    const updateData = {
      name,
      email,
      phone,
      Address: address,
    };

    // If image file was uploaded
    if (req.file) {
      updateData.image = `/uploads/tenants/${req.file.filename}`;
    }

    const updatedTenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedTenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      tenant: updatedTenant
    });

  } catch (err) {
    console.error('Error updating tenant profile:', err);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
};

// Get all invoices for the logged-in tenant
exports.getTenantInvoices = async (req, res) => {
  try {
   //Find tenant by the logged-in user's ID
   const tenant = await Tenant.findById(req.user._id);
   if(!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Fetch invoices for the tenant
    const invoices = await Invoice.find({ 
      tenant: tenant._id
    }).sort({ dueDate: -1 });

    res.status(200).json({ success: true, invoices });
  } catch (error) {
    console.error('Error fetching tenant invoices:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tenant invoices' });
  }
};

// DELETE tenant by ID (Landlord-only)
exports.deleteTenant = async (req, res) => {
  try {
    if (req.user.userType !== 'Landlord') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { tenantId } = req.params;

    const deletedTenant = await Tenant.findByIdAndDelete(tenantId);

    if (!deletedTenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.status(200).json({ success: true, message: 'Tenant deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};