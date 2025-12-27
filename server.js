const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketio = require('socket.io');
const cron = require('node-cron');

const errorHandler = require('./middleware/errorHandler');
const SystemLog = require('./models/SystemLog');
const Tenant = require('./models/tenants');
const Payment = require('./models/payments');

dotenv.config();

const app = express();
const server = http.createServer(app);

/* ===============================
   🌍 ALLOWED ORIGINS (DEV + PROD)
================================= */
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  process.env.FRONTEND_URL // Netlify/Vercel URL
].filter(Boolean);

/* ===============================
   🔌 SOCKET.IO SETUP
================================= */
const io = socketio(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`👤 User ${userId} joined room`);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

/* ===============================
   🧱 MIDDLEWARE
================================= */
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log('❌ Blocked by CORS:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json());
app.use(cookieParser());

/* ===============================
   📁 STATIC FILES (LOCAL ONLY)
================================= */
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

/* ===============================
   🔐 MONGODB CONNECTION
================================= */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.log("Mongo URI exists:", !!process.env.MONGODB_URI);
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

/* ===============================
   🚏 API ROUTES
================================= */
app.use('/api', require('./routes/admin'));
app.use('/api/system', require('./routes/SystemLog'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/landlords', require('./routes/landlords'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/quiz', require('./routes/genQuiz'));
app.use('/api/invoices', require('./routes/invoice'));
app.use('/api/mpesa', require('./routes/mpesa'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/review-payments', require('./routes/reviewPayments'));

/* ===============================
   ❤️ HEALTH CHECK (RENDER)
================================= */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

/* ===============================
   ❌ 404 HANDLER
================================= */
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

/* ===============================
   ⚠️ GLOBAL ERROR HANDLER
================================= */
app.use(errorHandler);

/* =====================================================
   🕒 CRON JOB — RUN ONCE (DAILY @ MIDNIGHT)
===================================================== */
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ Running daily tenant balance update...');

  try {
    const tenants = await Tenant.find({});
    const now = new Date();

    for (const tenant of tenants) {
      const rent = tenant.rent || 0;
      const startDate = tenant.lease_start || tenant.createdAt || now;

      const monthsElapsed =
        (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth()) + 1;

      const totalRentDue = rent * monthsElapsed;

      const payments = await Payment.aggregate([
        { $match: { tenant: tenant._id } },
        { $group: { _id: null, totalPaid: { $sum: '$amountPaid' } } }
      ]);

      const totalPaid = payments[0]?.totalPaid || 0;
      const balance = totalRentDue - totalPaid;

      tenant.credit = balance < 0 ? Math.abs(balance) : 0;
      tenant.arrears = balance > 0 ? balance : 0;
      await tenant.save();
    }

    await SystemLog.create({
      event: 'Tenant Balance Update',
      status: 'Success',
      message: `Updated ${tenants.length} tenants`
    });

    console.log('✅ Tenant balances updated');
  } catch (err) {
    console.error('❌ Cron job error:', err);

    await SystemLog.create({
      event: 'Tenant Balance Update',
      status: 'Error',
      message: err.message
    });
  }
});

/* ===============================
   🚀 SERVER START
================================= */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
