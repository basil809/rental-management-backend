// controllers/landlordController.js
const Landlord = require('../models/landlords');
const Property = require('../models/properties');
const Tenant = require('../models/tenants');
const Invoice = require('../models/Invoice');
const Payment = require('../models/payments');
const MaintenanceRequest = require('../models/maintenancerequests');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid'); //For tenant ID
const bcrypt = require('bcrypt');
require('dotenv').config();

// ✅ [1] Register a landlord
exports.createLandlord = async (req, res) => {
  try {
    const { name, email, phone, idNumber, address, property } = req.body;

    const plainPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const landlord = new Landlord({
      name,
      email,
      phone,
      idNumber,
      address,
      property,
      password: hashedPassword
    });

    await landlord.save();

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
      subject: 'Welcome to La Maison - Landlord Access',
      html: `
        <p>Dear ${name},</p>
        <p>Your landlord account has been created successfully.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${plainPassword}</p>
        <p>You can now log in to your dashboard using these credentials.</p>
        <p>Regards,<br>La Maison Team</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Landlord registered and email sent successfully' });
  } catch (err) {
    console.error('Landlord creation error:', err);
    res.status(500).json({ message: 'Something went wrong during landlord registration' });
  }
};

// ✅ [2] Get count of all landlords
exports.getLandlordCount = async (req, res) => {
  try {
    const count = await Landlord.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error('Error fetching landlord count:', err);
    res.status(500).json({ message: 'Failed to fetch landlord count' });
  }
};

// ✅ [3] Get all landlords
exports.getAllLandlords = async (req, res) => {
  try {
    const landlords = await Landlord.find();
    res.json(landlords);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ [4] Get landlord by ID from URL
exports.getLandlordById = async (req, res) => {
  try {
    const landlord = await Landlord.findById(req.params.id);
    if (!landlord) return res.status(404).json({ message: 'Landlord not found' });
    res.json(landlord);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Landlord logout
exports.logoutLandlord = async (req, res) => {
  try {
    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'Strict' });
    res.status(200).json({ success: true, message: 'Landlord logged out successfully' });
  } catch (err) {
    console.error('Error during landlord logout:', err);
    res.status(500).json({ success: false, message: 'Failed to log out landlord' });
  }
};

// ✅ [5] Update landlord
exports.updateLandlord = async (req, res) => {
  try {
    const landlord = await Landlord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(landlord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ✅ [6] Delete landlord
exports.deleteLandlord = async (req, res) => {
  try {
    await Landlord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Landlord deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ [7] NEW: Get logged-in landlord's profile (used in /profile)
exports.getLandlordByIdFromAuth = async (userId) => {
  try {
    const landlord = await Landlord.findById(userId).select('-password'); // Exclude password
    return landlord;
  } catch (err) {
    console.error('Error getting landlord profile:', err);
    return null;
  }
};

// ✅ [8] get Tenants by landlord's property
exports.getTenantsByProperty = async (req, res) => {
  try {
    if (req.user.userType !== 'Landlord') {
      return res.status(403).json({ success: false, message: 'Only landlords can view tenants' });
    }

    const landlordProperty = req.user.property;
    const tenants = await Tenant.find({ property: landlordProperty });

    res.status(200).json({ success: true, tenants });
  } catch (err) {
    console.error('Error fetching tenants:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ [9] get Invoices by landlord's property
exports.getInvoicesByProperty = async (req, res) => {
  try {
    if (req.user.userType !== 'Landlord') {
      return res.status(403).json({ success: false, message: 'Only landlords can view invoices' });
    }

    const landlordProperty = req.user.property;
    const invoices = await Invoice.find({ property: landlordProperty });

    res.status(200).json({ success: true, invoices });
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

//✅ [10] Get tenants payment via landlord's property
exports.getPaymentsByProperty = async (req, res) => {
  try {
    if(req.user.userType !== 'Landlord') {
      return res.status(403).json({ success: false, message: 'Only landlords can view tenants' });
    }

    const landlordProperty = req.user.property;
    const payments = await Payment.find({ property: landlordProperty });

    res.status(200).json({ success: true, payments });
  } catch (err) {
    console.error('Error fetching Payments:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ [11] update the tenant's details via landlord's dashboard
exports.updateTenant = async (req, res) => {
    const tenantId = req.params.id;
    const { name, phone, roomNumber, rent } = req.body;

    // Input validation (basic)
    if (!name || !phone || !roomNumber || rent === undefined) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found.' });
        }

        // Update fields
        tenant.name = name;
        tenant.phone = phone;
        tenant.roomNumber = roomNumber;
        tenant.rent = rent;

        await tenant.save();

        return res.status(200).json({ success: true, message: 'Tenant updated successfully.' });
    } catch (error) {
        console.error('Error updating tenant:', error);
        return res.status(500).json({ success: false, message: 'Server error while updating tenant.' });
    }
};

// ✅ [12] update landlord info + image from modal
exports.updateLandlordProfileFromModal = async (req, res) => {
  try {
    const landlordId = req.user._id;
    const { name, email, phone, idNumber, address, password } = req.body;

    //Build update object 
    const updateData = {
      name,
      email,
      phone,
      idNumber,
      address,
    };

    // ✅ If a new password is provided, hash it
    if (password && password.trim() !== '') {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateData.password = hashedPassword;
    }

    //If Image file was uploaded
    if (req.file) {
      updateData.image = `/uploads/landlords/${req.file.filename}`;
    }

    const updatedLandlord = await Landlord.findByIdAndUpdate(
      landlordId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedLandlord) {
      return res.status(404).json({ success: false, message: 'Landlord not found.' })
    }

    res.json({
      success: true,
      message: 'Landlord profile updated successfully.',
      landlord: updatedLandlord
    });

    } catch (err) {
      console.error('Error updating landlord profile:', err);
      res.status(500).json({ success: false, message: 'Server error while updating landlord profile.' });
    }
};

// ✅ [13] count the number of tenants in the property of the logged in landlord
exports.countTenantsInProperty = async (req, res) => {
  try {
    const landlordId = req.user._id;
    const landlord = await Landlord.findById(landlordId);

    if (!landlord) {
      return res.status(404).json({ success: false, message: 'Landlord not found.' });
    }

    // Find all tenants associated with the landlord's property
    const tenants = await Tenant.find({ property: landlord.property });
    if (!tenants) {
      return res.status(404).json({ success: false, message: 'No tenants found.' 
    });
    }
    const tenantCount = tenants.length;

    return res.json({ success: true, tenantCount });
  } catch (err) {
    console.error('Error counting tenants in property:', err);
    res.status(500).json({ success: false, message: 'Server error while counting tenants in property.' });
  }
};

// ✅ [14] count the number of invoices sent to the tenants of the logged in landlord
exports.countInvoicesSentToTenants = async (req, res) => {
  try {
    const landlordId = req.user._id;
    const landlord = await Landlord.findById(landlordId);

    if (!landlord) {
      return res.status(404).json({ success: false, message: 'Landlord not found.' });
    }

    //Get the current date and claculate the start and end of the current month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Find all invoices associated with the landlord's property
    const invoices = await Invoice.find({ 
      property: landlord.property,
      updatedAt: {
        $gte: startOfMonth, // Greater than or equal to the start of the month
        $lte: endOfMonth    // Less than or equal to the end of the month
      }
     });
     
    if (!invoices) {
      return res.status(404).json({ success: false, message: 'No invoices found.' 
    });
    }
    const invoiceCount = invoices.length;
    
    return res.json({ success: true, invoiceCount });
  } catch (err) {
    console.error('Error counting invoices sent:', err);
    res.status(500).json({ success: false, message: 'Server error while counting invoices sent.' });
  }
};

// ✅ [15] count the number of payments received by the logged in landlord
exports.countPaymentsReceivedByLandlord = async (req, res) => {
  try {
    const landlordId = req.user._id;
    const landlord = await Landlord.findById(landlordId);

    if (!landlord) {
      return res.status(404).json({ success: false, message: 'Landlord not found.' });
    }

    // Get the current date and calculate the start and end of the current month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Find all payments associated with the landlord's property and within the current month
    const payments = await Payment.find({
      property: landlord.property,
      paymentDate: {
        $gte: startOfMonth, // Greater than or equal to the start of the month
        $lte: endOfMonth    // Less than or equal to the end of the month
      }
    });

    if (!payments || payments.length === 0) {
      return res.status(404).json({ success: false, message: 'No payments found for the current month.' });
    }

    const paymentCount = payments.length;
    
    return res.json({ success: true, paymentCount });
  } catch (err) {
    console.error('Error counting payments:', err);
    res.status(500).json({ success: false, message: 'Server error while counting payments.' });
  }
};

// ✅ [16] count the maintenance requests received by the logged in landlord
exports.countMaintenanceRequestsByLandlord = async (req, res) => {
  try {
    const landlordId = req.user._id;
    const landlord = await Landlord.findById(landlordId);

    if (!landlord) {
      return res.status(404).json({ success: false, message: 'Landlord not found.' });
    }

    //Get the current date and calculate the start and end of the current month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), + 1, 0);

    //Find all maintenance requests associated with the landlord's property
    const maintenanceRequests = await MaintenanceRequest.find({ 
      property: landlord.property,
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
     });
    if (!maintenanceRequests) {
      return res.status(404).json({ success: false, message: 'No maintenance requests found.' 
    });
    }
    const maintenanceRequestCount = maintenanceRequests.length;
    
    return res.json({ success: true, maintenanceRequestCount });
  } catch (err) {
    console.error('Error counting maintenance requests:', err);
    res.status(500).json({ success: false, message: 'Server error while counting maintenance requests.' });
  }
};

// ✅ [17] Get rentable units for the logged-in landlord
exports.getRentableUnits = async (req, res) => {
  try {
    const landlordId = req.user._id;

    // Get landlord by ID
    const landlord = await Landlord.findById(landlordId);
    if (!landlord) {
      return res.status(404).json({ success: false, message: 'Landlord not found.' });
    }

    // Find property posted by this landlord
    const property = await Property.findOne({ landlord: landlord.name }); // match string name
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found for landlord.' });
    }

    // Count all tenants in this property
    const tenants = await Tenant.find({ property: property.title }); // assuming `property` field on Tenant is a string like 'Keywest Gardens'
    const tenantCount = tenants.length;

    // Calculate available units
    const availableUnits = property.units - tenantCount;

    res.status(200).json({
      success: true,
      message: `Available units in ${property.title}`,
      availableUnits
    });

  } catch (error) {
    console.error('Error fetching available units:', error);
    res.status(500).json({ success: false, message: 'Server error while getting available units.' });
  }
};

// ✅ [18] get the total balance rent for the tenants of the logged-in landlord
exports.getTenantBalance = async (req, res) => {
  try {
    const landlordId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Find landlord
    const landlord = await Landlord.findById(landlordId);

    if (!landlord) {
      return res.status(404).json({ success: false, message: 'Landlord not found.' });
    }

    // Get landlord's property
    const property = await Property.findOne({ email: landlord.email });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found for this landlord.' });
    }

    // Get tenants for this property and there total arears
    const tenants = await Tenant.find({ property: property.title });
    const tenantIds = tenants.map(tenant => tenant._id); // Extract ObjectIds
    const result = await Tenant.aggregate([
      {
        $match: {
          _id: { $in: tenantIds } // Filter by tenant ObjectIds
        }
      },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$arrears" }
        }
      }
    ]);
    const totalBalance = result[0]?.totalBalance || 0;

    res.status(200).json({
      success: true,
      totalBalance
    });
    
  } catch (err) {
    console.error('Error calculating tenant balance:', err);
    res.status(500).json({ success: false, message: 'Server error calculating tenant balance.' });
  }
}; 

// ✅ [19] Get the total amount to be received by the landlord for the current month via the invoice
exports.calculateTenantBalance = async (req, res) => {
  try {
    const landlordId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Step 1: Find landlord and their property
    const landlord = await Landlord.findById(landlordId);
    if (!landlord) {
      return res.status(404).json({ success: false, message: 'Landlord not found' });
    }

    const property = await Property.findOne({ email: landlord.email });
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Step 2: Get all tenant IDs for the property
    const tenants = await Tenant.find({ property: property.title });
    const tenantIds = tenants.map(tenant => tenant._id); // Extract ObjectIds

    // Step 3: Use aggregation to sum invoices for the current month
    const result = await Invoice.aggregate([
      {
        $match: {
          tenant: { $in: tenantIds }, // Filter by tenant ObjectIds
          property: property.title,   // Filter by property (case-sensitive)
          updatedAt: { 
            $gte: startOfMonth, 
            $lte: endOfMonth 
          }, // Optional: Filter by current month
        }
      },
      {
        $group: {
          _id: null,
          totalInvoice: { $sum: "$amount" }
        }
      }
    ]);

    const totalInvoice = result[0]?.totalInvoice || 0;

    res.status(200).json({
      success: true,
      totalInvoice
    });

  } catch (err) {
    console.error('Error calculating tenant Invoice:', err);
    res.status(500).json({ success: false, message: 'Server error calculating tenant Invoice.' });
  }
};

//This code is for displaying the amount the landlord is expecting to receive for the current month based on the payments made by the tenants.
exports.calculateTotalAmountReceived = async (req, res) => {
  try {
    const landlordId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Find landlord and their property
    const landlord = await Landlord.findById(landlordId);
    if (!landlord) {
      return res.status(404).json({ success: false, message: 'Landlord not found' });
    }

    const property = await Property.findOne({ email: landlord.email });
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // 2. Fetch payments made for the property THIS MONTH
    const payments = await Payment.aggregate([
      {
        $match: {
          property: property.title,
          paymentDate: { $gte: startOfMonth, $lte: endOfMonth }, // Filter by current month
          status: 'completed' // Optional: Only count successful payments for future use
        }
      },
      {
        $group: {
          _id: null,
          totalAmountReceived: { $sum: "$amountPaid" } // Sum actual payments
        }
      }
    ]);

    const totalAmountReceived = payments[0]?.totalAmountReceived || 0;

    // 3. (Optional) Compare with expected rent for insights
    const tenants = await Tenant.find({ property: property.title });
    const expectedRent = tenants.reduce((sum, tenant) => sum + tenant.rent, 0);

    res.status(200).json({
      success: true,
      totalAmountReceived,
      expectedRent,
      paymentCoverage: expectedRent > 0 ? (totalAmountReceived / expectedRent * 100).toFixed(2) + '%' : 'N/A'
    });

  } catch (err) {
    console.error('Error calculating landlord total amount received:', err);
    res.status(500).json({ success: false, message: 'Server error calculating landlord total amount received.' });
  }
};

// ✅ [21] Get the loggedin landlord Property and available units
exports.getUnoccupiedUnits = async (req, res) => {
  try {
    // 1. Get landlord id from logged-in user
    const landlordId = req.user._id;

    // 2. Find the property owned by the landlord
    const property = await Property.findOne({ landlord: landlordId });
    if (!property) {
      return res.status(404).json({ message: 'No property found for this landlord' });
    }

    // 3. Get all unit names from the property
    const allUnits = property.units; // assuming units is an array of unit names

    // 4. Find occupied units in Tenants collection
    const occupiedTenants = await Tenant.find({ 
      property: property._id, 
      roomNumber: { $ne: null } 
    });

    const occupiedUnits = occupiedTenants.map(t => t.roomNumber);

    // 5. Find unoccupied units
    const unoccupiedUnits = allUnits.filter(unit => !occupiedUnits.includes(unit));

    // 6. Return the result
    res.json({
      property: property.name,
      unoccupiedUnits
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ✅ [22] Create A new tenant
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

// ✅ [23] create invoice
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

// ✅ [24] a new payment
exports.makePayment = async (req, res) => {
  try {
    const { tenant, tenantName, tenantID, property, roomNumber, amountPaid, datePaid, method, comment, actor } = req.body;

    const newPayment = new Payment({
      tenant,
      tenantName,
      tenantID,
      property,
      roomNumber,
      amountPaid,
      datePaid,
      method,
      comment,
      actor,
      date: new Date()
    });

    const savedPayment = await newPayment.save();

    res.status(201).json({ message: 'Payment recorded successfully', payment: savedPayment });
  } catch (error) {
    console.error('Error making payment:', error);
    res.status(500).json({ message: 'Server error while making payment' });
  }
};