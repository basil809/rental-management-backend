const MaintenanceRequest = require('../models/maintenancerequests');

// Tenant creates a request
exports.createRequest = async (req, res) => {
  if (req.user.userType !== 'Tenant') {
    return res.status(403).json({
      success: false,
      message: 'Only tenants can create maintenance requests'
    });
  }

  try {
    const {
      name,
      phone,
      property,
      roomNumber,
      type,
      date,
      description
    } = req.body;

    const request = new MaintenanceRequest({
      tenantId: req.user.id,
      tenantName: name,
      phoneNumber: phone,
      property: property,
      houseNumber: roomNumber,
      type,
      RequestDate: date,
      description
    });

    await request.save();

    res.status(201).json({
      success: true,
      message: 'Request submitted successfully',
      data: request
    });
  } catch (err) {
    console.error('Error creating request:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// Tenant gets their own requests
exports.getTenantRequests = async (req, res) => {
  if (req.user.userType !== 'Tenant') {
    return res.status(403).json({
      success: false,
      message: 'Only tenants can view their requests'
    });
  }

  try {
    const requests = await MaintenanceRequest.find({ tenantId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    console.error('Error fetching tenant requests:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// Admin or Landlord: get all requests
exports.getAllRequests = async (req, res) => {
  if (req.user.userType !== 'Admin' && req.user.userType !== 'Landlord') {
    return res.status(403).json({
      success: false,
      message: 'Only landlords or admins can view all requests'
    });
  }

  try {
    // Get the landlord's property (as string)
    const landlordProperty = req.user.property;

    if (!landlordProperty) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Find only requests for that property
    const requests = await MaintenanceRequest.find({
      property: landlordProperty
    })
      .populate('tenantId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    console.error('Error fetching requests for landlord:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};


// Admin or Landlord updates request status
exports.updateRequestStatus = async (req, res) => {
  if (req.user.userType !== 'Admin' && req.user.userType !== 'Landlord') {
    return res.status(403).json({
      success: false,
      message: 'Only landlords or admins can update request status'
    });
  }

  try {
    const { requestId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['Pending', 'Rejected', 'Resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const updateData = { status };
    if (status === 'Resolved') {
      updateData.resolvedAt = new Date();
    }

    if (status === 'Rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const updatedRequest = await MaintenanceRequest.findByIdAndUpdate(
      requestId,
      updateData,
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Request updated successfully',
      data: updatedRequest
    });
  } catch (err) {
    console.error('Error updating request status:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// Admin: get all request count
exports.getAllRequestCount = async (req, res) => {
  if (req.user.userType !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Only admins can view all request count'
    });
  }
  try {
    //Get the current date and calculate the start and end of the month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    //Find the maintenance requests within the current month and count them
    const openCount = await MaintenanceRequest.countDocuments({
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    })
    res.status(200).json({ success: true, openCount });
    //const openCount = await MaintenanceRequest.countDocuments();
    //res.status(200).json({ success: true, openCount });
  } catch (err) {
    console.error('Error counting all requests:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};  

// Get maintenance request completion rate
exports.getRequestCompletionRate = async (req, res) => {
  try {
    //Get the current date and calculate the start and end of the month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    //Find the maintenance requests within the current month and calculate completion rate
    const totalRequests = await MaintenanceRequest.countDocuments({
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });
    const resolvedRequests = await MaintenanceRequest.countDocuments({
      status: 'Resolved',
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });
    const completionRate = totalRequests === 0 ? 0 : Math.round((resolvedRequests / totalRequests) * 100);
    //const totalRequests = await MaintenanceRequest.countDocuments();
    //const resolvedRequests = await MaintenanceRequest.countDocuments({ status: 'Resolved' });
    //const completionRate = totalRequests === 0 ? 0 : Math.round((resolvedRequests / totalRequests) * 100);
    res.status(200).json({ success: true, completionRate });
  } catch (err) {
    console.error('Error calculating request completion rate:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// Tenant request count
exports.getTenantRequestCount = async (req, res) => {
  if (req.user.userType !== 'Tenant') {
    return res.status(403).json({
      success: false,
      message: 'Only tenants can view their request count'
    });
  }

  try {
    const count = await MaintenanceRequest.countDocuments({ tenantId: req.user.id });
    res.status(200).json({ success: true, count });
  } catch (err) {
    console.error('Error counting tenant requests:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

//code for displaying notifications (whether rejected or completed requests)
exports.getTenantNotifications = async (req, res) => {
  try {
    const notifications = await MaintenanceRequest.find({
      tenantId: req.user.id,
      notified: false,
      status: { $in: ['Resolved', 'Rejected'] }
    });

    res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('Notification fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

//code for marking requests as notified
exports.markRequestAsNotified = async (req, res) => {
  try {
    const { requestId } = req.params;

    const result = await MaintenanceRequest.findOneAndUpdate(
      { _id: requestId, tenantId: req.user.id },
      { $set: { notified: true } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, message: 'Marked as notified' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

