const express = require('express');
const router = express.Router();
const SystemLog = require('../models/SystemLog');

// ✅ GET /api/system/system-logs?page=1&limit=10&status=All
router.get('/system-logs', async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'All' } = req.query;
    const query = {};

    if (status !== 'All') {
      query.status = status;
    }

    const totalLogs = await SystemLog.countDocuments(query);
    const logs = await SystemLog.find(query)
      .sort({ timestamp: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      logs,
      currentPage: Number(page),
      totalPages: Math.ceil(totalLogs / limit),
      totalLogs,
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
