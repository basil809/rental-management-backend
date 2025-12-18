const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Admin = require('../models/admin');
const AdminController = require('../controllers/adminController');

// ✅ Get all admins (excluding password)
router.get('/admins', async (req, res) => {
  try {
    const admins = await Admin.find({}, '-password');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching admins.' });
  }
});

// ✅ get Admin's profile 
// ✅ Protected route (uses authMiddleware)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const admin = await AdminController.getAdminByIdAuth(req.user.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    res.json({ success: true, admin });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching profile.' });
  }
});

// ✅ Get one admin by ID
router.get('/admins/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id, '-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching admin.' });
  }
});

// ✅ Create new admin
router.post('/admins', async (req, res) => {
  try {
    const { username, email, password } = req.body; // 🔁 changed name → username
    const admin = new Admin({ username, email, password });
    await admin.save();
    res.status(201).json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error while creating admin.' });
  }
});


// ✅ Update admin
router.put('/admins/:id', async (req, res) => {
  try {
    const { username, email, password } = req.body; // 🔁 changed name → username
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    admin.username = username;
    admin.email = email;
    if (password) {
      admin.password = password; // only update if a new password is provided
    }

    await admin.save();
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error while updating admin.' });
  }
});

// ✅ Delete admin
router.delete('/admins/:id', async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }
    res.json({ message: 'Admin deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while deleting admin.' });
  }
});

module.exports = router;
