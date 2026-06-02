const nodemailer = require('nodemailer');
require('dotenv').config();
(async () => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: { rejectUnauthorized: false }
    });
    const info = await transporter.verify();
    console.log('VERIFY OK:', info);
  } catch (err) {
    console.error('VERIFY ERROR:', err);
    if (err.code) console.error('CODE:', err.code);
    if (err.response) console.error('RESPONSE:', err.response.toString());
    process.exit(1);
  }
})();
