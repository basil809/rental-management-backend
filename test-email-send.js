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
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'Test email from rental management backend',
      text: 'This is a test email from our diagnosis script.'
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('SEND OK:', info);
  } catch (err) {
    console.error('SEND ERROR:', err);
    if (err.code) console.error('CODE:', err.code);
    if (err.response) console.error('RESPONSE:', err.response.toString());
    process.exit(1);
  }
})();
