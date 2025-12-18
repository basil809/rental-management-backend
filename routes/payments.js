// routes/payments.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController.js');
const authMiddleware = require('../middleware/authMiddleware');
const Tenant = require('../models/tenants');
const Payment = require('../models/payments');
const Property = require('../models/properties');

//Get the count of payments (used in admin and landlord dashboard)
router.get('/count', paymentController.getPaymentCount);

// Get top paying tenants
router.get('/top-tenants', async (req, res) => {
  try {
    const topTenants = await Payment.aggregate([
      {
        $group: {
          _id: '$tenantName',
          totalPaid: { $sum: '$amountPaid' }
        }
      },
      { $sort: { totalPaid: -1 } },
      { $limit: 10 }
    ]);

    console.log('Leaderboard result:', topTenants); // <-- Add this

    res.json(topTenants);
  } catch (err) {
    console.error('Leaderboard aggregation failed:', err);
    res.status(500).json({ error: 'Server error while fetching leaderboard' });
  }
});

// Route to compute payment completion rate
router.get('/completion-rate', async (req, res) => {
  try {
    // 1. Aggregate Total Expected Rent and Total Arrears from all active tenants
    const aggregationResult = await Tenant.aggregate([
      {
        $group: {
          _id: null,
          totalExpectedRent: { $sum: "$rent" }, // Sum of all tenants' monthly rent
          totalArrears: { $sum: "$arrears" }    // Sum of all tenants' current arrears
        }
      }
    ]);

    const data = aggregationResult[0];

    // Check if any tenants exist; set sensible defaults if not
    const totalExpectedRent = data?.totalExpectedRent || 1; // Use 1 to prevent division by zero
    const totalArrears = data?.totalArrears || 0;

    console.log(`Aggregation Result: Expected Rent = ${totalExpectedRent}, Arrears = ${totalArrears}`);
    // 2. Calculate the "Cleared Rent" amount
    // The amount of rent that has been successfully paid off (Expected - Arrears)
    const totalClearedRent = totalExpectedRent - totalArrears;
    console.log(`Total Cleared Rent: ${totalClearedRent}`);
    // 3. Calculate percentage
    // Completion Rate = (Cleared Rent / Expected Rent) * 100
    const completionRate = Math.round((totalClearedRent / totalExpectedRent) * 100);

    // Ensure the rate is not negative (though it shouldn't be if data is managed correctly)
    const finalCompletionRate = Math.max(0, completionRate); 

    console.log(`Total Expected Rent: ${totalExpectedRent}, Total Arrears: ${totalArrears}, Completion Rate: ${finalCompletionRate}%`);
    res.json({ completionRate: finalCompletionRate });
  } catch (err) {
    console.error("Error calculating payment completion rate:", err);
    res.status(500).json({ error: "Failed to calculate payment completion rate" });
  }
});

//Route to update the paymentVolumeChart
router.get('/volume', async (req, res) => {
  try {
    const volumeData = await Payment.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$paymentDate" },
            month: { $month: "$paymentDate" }
          },
          total: { $sum: "$amountPaid" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Format result for frontend
    const labels = volumeData.map(entry => {
      const month = entry._id.month.toString().padStart(2, '0');
      return `${entry._id.year}-${month}`;
    });

    const values = volumeData.map(entry => entry.total);

    res.json({ labels, values });
  } catch (err) {
    console.error("Error fetching volume data:", err);
    res.status(500).json({ error: "Failed to fetch payment volume data" });
  }
});

//route to update the second paymentVolumeChart whether all weeks or weeks of a specific month
//ALL WEEKS
router.get('/weeks', async (req, res) => {
  try {
    const weeks = await Payment.aggregate([
      {
        $project: {
          year: { $isoWeekYear: "$paymentDate" },
          week: { $isoWeek: "$paymentDate" },
          month: { $month: "$paymentDate" }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            week: "$week",
            month: "$month"
          }
        }
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.week": 1
        }
      }
    ]);

    const formatted = weeks.map(w => ({
      label: `Week ${w._id.week} of ${w._id.month}/${w._id.year}`,
      value: `${w._id.week}-${w._id.month}-${w._id.year}`
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching weeks:', err);
    res.status(500).json({ error: 'Failed to fetch weeks' });
  }
});

//Specific MONTH WEEKS
router.get('/volume-weekly', async (req, res) => {
  try {
    const { week, month, year } = req.query;

    const pipeline = [];

    if (week && month && year) {
      pipeline.push({
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $isoWeek: "$paymentDate" }, parseInt(week)] },
              { $eq: [{ $month: "$paymentDate" }, parseInt(month)] },
              { $eq: [{ $isoWeekYear: "$paymentDate" }, parseInt(year)] }
            ]
          }
        }
      });
    }

    pipeline.push(
      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$paymentDate" },
            month: { $month: "$paymentDate" },
            year: { $year: "$paymentDate" }
          },
          total: { $sum: "$amountPaid" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    );

    const data = await Payment.aggregate(pipeline);

    const labels = data.map(d => `${d._id.year}-${d._id.month}-${d._id.day}`);
    const values = data.map(d => d.total);

    res.json({ labels, values });
  } catch (err) {
    console.error('Error fetching weekly volume:', err);
    res.status(500).json({ error: 'Failed to fetch volume' });
  }
});

//code for loading the payment made in the current month
router.get('/total-this-month', async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const total = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amountPaid" }
        }
      }
    ]);
    const amount = total.length > 0 ? total[0].totalPaid : 0;
    res.json({ totalPaid: amount });
  } catch (err) {
    console.error('Error calculating total for this month:', err);
    res.status(500).json({ error: 'Failed to calculate' });
  }
});

//code for loading the payment made in the current week
router.get('/total-this-week', async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? 6 : day - 1; // Adjust for Sunday

    //set to Monday
    startOfWeek.setDate(today.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const total = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startOfWeek }
        }
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amountPaid" }
        }
      }
    ]);

    const amount = total.length > 0 ? total[0].totalPaid : 0;

    res.json({totalPaid: amount });
  } catch (err) {
    console.error('Error calculating total for this week:', err);
    res.status(500).json({ error: 'Failed to calculate' });
  }
});

//Other payment routes
router.post('/', authMiddleware, paymentController.makePayment);

//code for getting the balance of the tenants for the Admin
router.get('/balance', authMiddleware, paymentController.getTenantBalances);

//code for getting the total balance (Monthly due + Arrears) for the admin
router.get('/total-balance', authMiddleware, paymentController.getTotalBalance);

//code for getting the ancipitated amount of rent for the admin
router.get('/anticipated', authMiddleware, paymentController.getAnticipatedAmount);

//route for enabling the tenant to view their payment history
// Route to get the latest payments for the admin
router.get('/admin/latest', authMiddleware, paymentController.getAdminLatestPayments);

// Route to get latest payments for the landlord
router.get('/landlord/latest', authMiddleware, paymentController.getLandlordLatestPayments);

//Routes for getting all tenants payments with status to updated the table for tenants records.
router.get('/tenants', paymentController.getTenantPayments);

router.get('/', authMiddleware, paymentController.getAllPayments);
router.get('/:id', authMiddleware, paymentController.getPaymentById);
router.put('/:id', authMiddleware, paymentController.updatePayment);
router.delete('/:id', authMiddleware, paymentController.deletePayment);

module.exports = router;