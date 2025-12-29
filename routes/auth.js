const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

const Admin = require('../models/admin');
const Landlord = require('../models/landlords');
const Tenant = require('../models/tenants');

const JWT_SECRET = process.env.JWT_SECRET || 'n9&Lk!zP2x@Qe7#rV8sWf$uT0&jD';

// LOGIN ENDPOINT for admin, landlord, tenant
router.post('/login/:type', async (req, res) => {
  const { type } = req.params;
  const { identifier, password } = req.body;

  let user;
  let matchField;

  try {
    if (type === 'admin') {
      user = await Admin.findOne({ username: identifier });
      matchField = 'username';
    } else if (type === 'landlord') {
      user = await Landlord.findOne({ email: identifier });
      matchField = 'email';
    } else if (type === 'tenant') {
      user = await Tenant.findOne({ tenantID: identifier });
      matchField = 'tenantID';
    } else {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    if (!user) {
      return res.status(401).json({
        message: `User not found with ${matchField}: ${identifier}`
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, type },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res
      .status(200)
      .cookie('token', token, {
        httpOnly: true,
        secure: true,     // REQUIRED on Render
        sameSite: 'None', // REQUIRED for Vercel ↔ Render
        maxAge: 60 * 60 * 1000
      })
      .json({
        message: 'Login successful',
        userType: type
      });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
