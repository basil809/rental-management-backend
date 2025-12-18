const Payment = require('../models/payments');
const Tenant = require('../models/tenants');

// Make a new payment
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

// Get payment count
exports.getPaymentCount = async (req, res) => {
  try {

   // Get the current date and calculate the start and end of the current month
       const currentDate = new Date();
       const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
       const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
   
       // Find all payments associated with the landlord's property and within the current month
       const payments = await Payment.find({
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

// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find();
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Server error while fetching payments' });
  }
};

//code for getting the payments of tenants and updating the tenant record table in the admin dashboard
exports.getTenantPayments = async (req, res) => {
  try {
    // ✅ Get page & limit from query (defaults to 1 & 20)
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // ✅ Count total tenants (for pagination)
    const totalTenants = await Tenant.countDocuments();

    // ✅ Get tenants for this page only
    const tenants = await Tenant.find().skip(skip).limit(limit);

    const tenantData = await Promise.all(
      tenants.map(async (tenant) => {
        // fetch all payments for this tenant
        const payments = await Payment.find({ tenantName: tenant.name });

        // calculate total paid
        const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);

        // assume tenant has monthly rent field and balance in Tenant collection
        const rent = tenant.rent;
        const balance = tenant.arrears || (rent - totalPaid);

        // determine status
        let status = "Not Paid";
        if (balance <= 0) status = "Cleared";
        else if (balance < rent) status = "Partially Cleared";

        return {
          tenantId: tenant._id,
          name: tenant.name,
          image: tenant.image || "images/system Images/user (1).png",
          property: tenant.property,
          roomNumber: tenant.roomNumber,
          rent: rent,
          totalPaid,
          balance: balance < 0 ? 0 : balance,
          status,
        };
      })
    );

    res.json({
      success: true,
      tenants: tenantData,
      pagination: {
        totalTenants,
        totalPages: Math.ceil(totalTenants / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(totalTenants / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Error fetching tenant payment status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//code for enabling the landlord veiw tenant payment history
// Get latest payments for logged-in landlord
exports.getLandlordLatestPayments = async (req, res) => {
  try {
    const propertyName = req.user.property; // landlord's property from login data

    if (!propertyName) {
      return res.status(400).json({ success: false, message: 'Property not found for landlord' });
    }

    // Get the current date and calculate the start and end of the current month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Find payments for this property within the current month
    const payments = await Payment.find({ 
      property: propertyName,
      paymentDate: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    })
      .sort({ paymentDate: -1 }) // Sort by paymentDate in descending order
      .limit(10); // Limit to 10 most recent payments

    // Format the transactions for the response
    const transactions = payments.map(payment => ({
      actor: payment.actor,
      description: `${payment.tenantName} paid ${payment.amountPaid.toLocaleString()} for ${payment.property}, Room ${payment.roomNumber}`,
      time: payment.paymentDate.toISOString().replace('T', ' : ').split('.')[0],
      paymentId: payment._id // Optional: Include payment ID for reference
    }));

    res.json({ success: true, transactions });

  } catch (error) {
    console.error('Error fetching landlord payments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error',
      error: error.message // Optional: Include error details for debugging
    });
  }
};

//Get latest payments for the admin
exports.getAdminLatestPayments = async (req, res) => {
  try {
    // Get the current date and calculate the start and end of the current month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    //Find the payments for the Admin
    const payments = await Payment.find({
      paymentDate: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    })
      .sort({ paymentDate: -1 })
      .limit(10);
      
    const transactions = payments.map(payment => ({
      actor: payment.actor,
      description: `${payment.tenantName} paid ${payment.amountPaid.toLocaleString()} for ${payment.property}, Room ${payment.roomNumber}`,
      time: payment.paymentDate.toISOString().replace('T', ' : ').split('.')[0]
    }));
    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// code for getting all the tenants balances for the admin (current month only)
exports.getTenantBalances = async (req, res) => {
  try {
    // Get the first and last day of the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const result = await Tenant.aggregate([
      // Step 1: Join with the Payments collection, filtering to current month
      {
        $lookup: {
          from: "payments",
          let: { tenantId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$tenant", "$$tenantId"] },
                paymentDate: { $gte: startOfMonth, $lte: endOfMonth } // <-- filter for current month
              },
            },
          ],
          as: "payments",
        },
      },

      // Step 2: Calculate total payments for each tenant (this month)
      {
        $addFields: {
          totalPayments: { $sum: "$payments.amountPaid" },
        },
      },

      // Step 3: Calculate balance (rent - totalPayments)
      {
        $addFields: {
          balance: { $subtract: ["$rent", "$totalPayments"] },
        },
      },

      // Step 4: Select fields to return
      {
        $project: {
          _id: 1,
          name: 1,
          rent: 1,
          totalPayments: 1,
          balance: 1,
        },
      },
    ]);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "No tenants found" });
    }

    // Step 5: Compute total balances (optional)
    const totalBalances = result.reduce((sum, tenant) => sum + tenant.balance, 0);

    // Step 6: Return the results
    res.status(200).json({
      success: true,
      tenantBalances: result,
      totalBalances,
      month: now.toLocaleString("default", { month: "long", year: "numeric" }),
    });
  } catch (err) {
    console.error("Error fetching tenant balances:", err);
    res.status(500).json({ message: "Server error fetching tenant balances" });
  }
};

//code for getting the total balance (Monthly due + Arrears) for the admin
//Let me know if you also want:

// To filter out tenants who have no dues at all.

// To return separate totals for arrears and monthly balances.

// Or a frontend-friendly format (like sorted output or highlighting overdue tenants).

// Would you like help integrating this into a dashboard or reporting module?
//exports.getTotalBalance = async (req, res) => {
  //try {
    //const now = new Date();
    //const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    //const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

//    const result = await Tenant.aggregate([
//      // Step 1: Lookup payments made in the current month
//      {
//        $lookup: {
//        from: "payments",
//         let: { tenantId: "$_id" },
//         pipeline: [
//          {
//             $match: {
//              $expr: { $eq: ["$tenant", "$$tenantId"] },              paymentDate: { $gte: startOfMonth, $lte: endOfMonth }
//            },
//            },
//         ],
//         as: "payments",
//        },
//      },
//
//      // Step 2: Sum payments for the month
//      {
//        $addFields: {
//          totalPayments: { $sum: "$payments.amountPaid" },
//        },
//      },
//
//      // Step 3: Calculate balance (this month only)
//      {
//        $addFields: {
//          balance: { $subtract: ["$rent", "$totalPayments"] },
//        },
//      },
//
//      // Step 4: Add arrears (if any) and calculate total balance due
//      {
//        $addFields: {
//          arrears: { $ifNull: ["$arrears", 0] }, // Ensure arrears field is treated as 0 if null
//          totalBalanceDue: { $add: ["$balance", { $ifNull: ["$arrears", 0] }] }
//        },
//      },
//
//      // Step 5: Select fields to return
//      {
//        $project: {
//          _id: 1,
//          name: 1,
//          rent: 1,
//          totalPayments: 1,
//          balance: 1,        // balance of current month
//          arrears: 1,        // past arrears
//          totalBalanceDue: 1 // final total
//        },
//      },
//    ]);
//
//    if (!result || result.length === 0) {
//      return res.status(404).json({ message: "No tenants found" });
//    }
//
//    // Step 6: Compute total of all balances
//    const totalBalances = result.reduce((sum, tenant) => sum + tenant.totalBalanceDue, 0);
//
//    // Step 7: Return results
//    res.status(200).json({
//      success: true,
//      tenantBalances: result,
//      totalBalances,
//      month: now.toLocaleString("default", { month: "long", year: "numeric" }),
//    });
//
//  } catch (err) {
//    console.error("Error fetching tenant balances:", err);
//    res.status(500).json({ message: "Server error fetching tenant balances" });
//  }
//};

// code getting the total balance (Monthly due + Arrears) for the admin
//code should get the all the arears saved in the tenant collection and add all of them
exports.getTotalBalance = async (req, res) => {
  try {
    const tenants = await Tenant.find({});
    const totalBalance = tenants.reduce((sum, tenant) => sum + (tenant.arrears || 0), 0);
    res.status(200).json({ success: true, totalBalance });
  } catch (err) {
    console.error("Error fetching total balance:", err);
    res.status(500).json({ message: "Server error fetching total balance" });
  }
};


// FORM: Get a payment by ID 
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('tenant property');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.status(200).json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: 'Server error while fetching payment' });
  }
};

// Optional: Update a payment
exports.updatePayment = async (req, res) => {
  try {
    const { amount, method } = req.body;

    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      { amount, method },
      { new: true }
    );

    if (!updatedPayment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.status(200).json({ message: 'Payment updated', payment: updatedPayment });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ message: 'Server error while updating payment' });
  }
};

// Landlord confirms or rejects a payment
exports.handlePaymentConfirmation = async (req, res) => {
    const { paymentId, action } = req.body;

    try {
        const pending = await PendingPayment.findById(paymentId);

        if (!pending) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (action === 'approve') {
            const confirmed = new Payment({
                tenantName: pending.tenantName,
                roomNumber: pending.houseNumber,
                amountPaid: pending.amount,
                paymentMethod: pending.paymentMethod,
                comment: 'Approved by landlord',
                paymentDate: pending.datePaid,
                property: 'To be populated if needed'
            });

            await confirmed.save();
            await pending.deleteOne();

            return res.status(200).json({ message: 'Payment approved and saved' });
        } else if (action === 'reject') {
            pending.status = 'rejected';
            await pending.save();
            return res.status(200).json({ message: 'Payment rejected' });
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error confirming payment' });
    }
};

// Get the ancipitated amount from tenants for the Admin
exports.getAnticipatedAmount = async (req, res) => {
  try {
    //code for fetching the all the tenants and the amount each is  expected to pay
    const tenants = await Tenant.find({});
    const anticipatedAmount = tenants.reduce((total, tenant) => total + tenant.rent, 0);
    res.status(200).json({ anticipatedAmount });
  } catch (error) {
    console.error('Error fetching anticipated amount:', error);
    res.status(500).json({ message: 'Server error while fetching anticipated amount' });
  }
};
    
// Fetch tenant’s payment status
exports.getTenantPaymentStatus = async (req, res) => {
    const tenantName = req.query.tenantName;

    try {
        const pending = await PendingPayment.findOne({ tenantName }).sort({ createdAt: -1 });

        if (pending) {
            return res.status(200).json({ status: pending.status });
        } else {
            return res.status(200).json({ status: 'not_found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Could not fetch payment status' });
    }
};

// Optional: Delete a payment
exports.deletePayment = async (req, res) => {
  try {
    const deletedPayment = await Payment.findByIdAndDelete(req.params.id);
    if (!deletedPayment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.status(200).json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ message: 'Server error while deleting payment' });
  }
};

