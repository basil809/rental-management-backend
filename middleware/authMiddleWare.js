const mongoose = require('mongoose'); 
const jwt = require('jsonwebtoken');
const Tenant = require('../models/tenants');
const Landlord = require('../models/landlords');
const Admin = require('../models/admin');

const JWT_SECRET = 'n9&Lk!zP2x@Qe7#rV8sWf$uT0&jD';

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    let user = await Tenant.findById(decoded.id);
    if (user) {
      req.user = {
        _id: user._id,              // existing code support
        id: user._id,               // new messaging code support
        role: 'Tenant',             // existing code
        userType: 'Tenant',         // messaging support
        tenantName: user.name,      // existing code
        name: user.name,            // for consistency
      };
      return next();
    }

    user = await Landlord.findById(decoded.id);
    if (user) {
      req.user = {
        _id: user._id,
        id: user._id,
        role: 'Landlord',
        userType: 'Landlord',
        landlordName: user.name,
        name: user.name,
         property: user.property,
      };
      return next();
    }

    user = await Admin.findById(decoded.id);
    if (user) {
      req.user = {
        _id: user._id,
        id: user._id,
        role: 'Admin',
        userType: 'Admin',
        adminName: user.username,  
      };
      return next();
    }

    return res.status(401).json({ message: 'Invalid token: user not found' });

  } catch (err) {
    return res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};

module.exports = authMiddleware;
