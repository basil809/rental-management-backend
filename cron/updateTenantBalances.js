const cron = require('node-cron');
const Tenant = require('../models/tenants');
const Payment = require('../models/payments');
const SystemLog = require('../models/SystemLog');

          ////////// WHAT THE CODE DOES //////////
// This cron job runs monthly to update tenant balances based on their rent, payments, and credit.
// It checks each tenant's rent due for the month and sees if they have enough credit to cover it.
// If they do, the rent is deducted from their credit.
// If they don't have enough credit, any remaining rent is added to their arrears balance.
// The job also logs payments made automatically using credit for record-keeping.

        ////////// HOW IT WORKS //////////
// if the tenant has credit, the code uses the credit to pay rent of the new month.
// if there is no credit, the rent is added to arrears.
// Run on the 2nd day of every month at 2:00am
cron.schedule("0 2 2 * *", async () => {
  console.log("🏠 Running monthly rent carry-forward job...");

  try {
    const tenants = await Tenant.find({});
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const firstDayLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastDayLastMonth = new Date(currentYear, currentMonth, 0);

    for (const tenant of tenants) {
      const rent = tenant.rent || 0;
      let credit = tenant.credit || 0;
      let arrears = tenant.arrears || 0;

      // Get total payments made last month
      //const payments = await Payment.aggregate([
      //  {
      //    $match: {
      //      tenant: tenant._id,
      //      paymentDate: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
      //    },
      //  },
      //  {
      //    $group: { _id: null, totalPaid: { $sum: "$amountPaid" } },
      //  },
      //]);

      //const totalPaid = payments[0]?.totalPaid || 0;
      //const totalAvailable = totalPaid + credit;

      let newCredit = 0;
      let newArrears = arrears; // keep previous arrears unless updated

      // CASE 1️⃣: Enough funds (payment + credit) to cover rent
      if (credit >= rent) {
        newCredit = credit - rent;
        newArrears = 0; // No arrears


        // Record system payment
        await Payment.create({
          tenant: tenant._id,
          tenantName: tenant.name,
          property: tenant.property,
          roomNumber: tenant.roomNumber,
          amountPaid: rent,
          date: new Date(),
          paymentDate: new Date(),
          paymentMethod: "Credit Carry Forward",
          comment: "Auto-applied using available credit and/or previous payments",
          actor: "System",
        });

        await SystemLog.create({
          event: "Auto Payment",
          status: "Success",
          message: `${tenant.name} rent cleared automatically. Remaining credit: Ksh ${newCredit.toLocaleString()}`,
        });

        console.log(`✅ ${tenant.name}: Rent fully covered. New credit: ${newCredit}`);

      // CASE 2️⃣: Partial funds (credit + payments) but not enough rent
      } else if ( credit > 0) {
        const unpaid = rent - credit;
        newCredit = 0; //All credit used up
        newArrears = arrears + unpaid; //Add unpaid amount to arrears
    

        // Record partial payment
        await Payment.create({
          tenant: tenant._id,
          tenantName: tenant.name,
          property: tenant.property,
          roomNumber: tenant.roomNumber,
          amountPaid: credit,
          date: new Date(),
          paymentDate: new Date(),
          paymentMethod: "Credit Carry Forward",
          comment: "Partial auto-payment applied from credit",
          actor: "System",
        });

        await SystemLog.create({
          event: "Partial Payment",
          status: "Success",
          message: `${tenant.name} rent partially paid with credit. Arrears carried: Ksh ${newArrears.toLocaleString()}`,
        });

        console.log(`⚠️ ${tenant.name}: Partial payment. New arrears: ${newArrears}`);

      // CASE 3️⃣: No payment, no credit
      } else {
        newArrears = arrears + rent; //Add full rent to arrears

        await SystemLog.create({
          event: "Unpaid Rent",
          status: "Pending",
          message: `${tenant.name} has no payment or credit. New arrears: Ksh ${newArrears.toLocaleString()}`,
        });

        console.log(`❌ ${tenant.name}: No payment. New arrears: ${newArrears}`);
      }

      // ✅ Update tenant record
      tenant.credit = newCredit;
      tenant.arrears = newArrears;
      await tenant.save();
    }

    console.log("✅ Monthly rent carry-forward job completed successfully.");
  } catch (err) {
    console.error("❌ Error in rent carry-forward job:", err);
    await SystemLog.create({
      event: "Cron Error",
      status: "Error",
      message: err.message,
    });
  }
});