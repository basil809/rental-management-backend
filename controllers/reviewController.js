const Review = require('../models/review');
const Invoice = require('../models/Invoice');
const Payment = require('../models/payments');

// ✅ Create a new review entry
exports.submitReview = async (req, res) => {
    try {
        const {
            tenantName,invoiceID, tenantID, phone, property,
            roomNumber, amountPaid, paymentMethod,
            invoiceId, datePaid
        } = req.body;

        // 🟢 Find the invoice by its ObjectId
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
        }

        const review = new Review({
            tenant: req.user.id,
            tenantName,
            tenantID,
            invoiceID,
            phone,
            property,
            roomNumber,
            amountPaid,
            paymentMethod,
            invoiceId: invoice.invoiceId,
            datePaid
        });

        await review.save();
        res.status(201).json({ success: true, message: 'Payment sent for review' });
    } catch (error) {
        console.error('Error saving review:', error);
        res.status(500).json({ success: false, message: 'Server error. Could not save review.' });
    }
};

// ✅ Get all reviews (for admin)
exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find().populate('tenant invoiceId');
        res.json({ success: true, reviews });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
    }
};

//code for approving or rejecting a payment
exports.approvePayment = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the review payment
        const reviewPayment = await Review.findById(id);
        if (!reviewPayment) {
            return res.status(404).json({ message: 'Review payment not found' });
        }

        // Update status to Approved
        reviewPayment.status = 'Approved';
        await reviewPayment.save();

        // Copy to main payments collection
        const newPayment = new Payment({
            tenant: reviewPayment.tenant,
            tenantName: reviewPayment.tenantName,
            property: reviewPayment.property,
            roomNumber: reviewPayment.roomNumber,
            amountPaid: reviewPayment.amountPaid,
            date: new Date(), // or use reviewPayment.datePaid
            paymentMethod: reviewPayment.paymentMethod,
            comment: "Payment approved by landlord.",
            paymentDate: reviewPayment.datePaid
        });

        await newPayment.save();

        res.status(200).json({ message: 'Payment approved and copied to payments collection' });
    } catch (error) {
        console.error('Error approving payment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// code for rejecting a payment
exports.rejectPayment = async (req, res) => {
    try {
        const { rejectionReason } = req.body;

        // Validate reason
        if (!rejectionReason || rejectionReason.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                message: 'Rejection reason is required' 
            });
        }

        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: 'Payment not found' 
            });
        }

        review.status = 'Rejected';
        review.rejectionReason = rejectionReason.trim(); // ✅ store reason
        review.rejectedAt = new Date(); // optional: track time of rejection

        await review.save();

        res.json({ 
            success: true, 
            message: 'Payment rejected successfully', 
            reason: review.rejectionReason 
        });
    } catch (error) {
        console.error('Error rejecting payment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};

// ✅ Code for displaying notifications for tenants (whether approved or rejected)
exports.getTenantNotifications = async (req, res) => {
    try {
        const tenantNotifications = await Review.find({ 
            tenant: req.user.id,
            notified: false,
            status: { $in: ['Approved', 'Rejected'] }
        });

        res.json({ success: true, data: tenantNotifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

//✅ Code for marking notifications as read
exports.markNotificationAsRead = async (req, res) => {
    try {
       const { id } = req.params;
       
       const result = await Review.findOneAndUpdate(
           { _id: id, tenant: req.user.id },
           { $set: { notified: true} },
           { new: true }
       );

    if (!result) {
           return res.status(404).json({ success: false, message: 'Notification not found' });
       }

       res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ✅ Get all reviews of tenants for the logged in Landlord
exports.getPaymentsForLandlord = async (req, res) => {
    try {
        const landlordProperty = req.user.property;
        const pendingPayments = await Review.find({ property: landlordProperty, status: 'Pending' });
        res.status(200).json({ pendingPayments }); // ✅ Fixed here
    } catch (err) {
        res.status(500).json({ message: 'Error fetching payments.' });
    }
};

//✅ Get status of payments for the logged in tenant(whether approved or rejected)
exports.getTenantPaymentStatus = async (req, res) => {
    try {
        const tenantID = req.user.id;
        const tenantPaymentStatus = await Review.find({ tenant: tenantID, status: { $ne: 'Pending' } });
        res.status(200).json(tenantPaymentStatus);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching payments.' });
    }
};

// ✅ Update review status (approve/reject)
exports.updateReviewStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    try {
        const updated = await Review.findByIdAndUpdate(id, { status }, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Review not found' });

        res.json({ success: true, review: updated });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ success: false, message: 'Could not update review status' });
    }
};
