const { google } = require('googleapis');
require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const EMAIL_USER = process.env.EMAIL_USER;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !EMAIL_USER) {
  console.warn('Google OAuth2 email service is missing required environment variables. Please set CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, and EMAIL_USER.');
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

function buildRawMessage(recipientEmail, subject, htmlBody, fromName) {
  const fromAddress = `${fromName} <${EMAIL_USER}>`;
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `From: ${fromAddress}`,
    `To: ${recipientEmail}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    htmlBody
  ];

  return Buffer.from(messageParts.join('\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendLoginCredentials(recipientEmail, username, password, options = {}) {
  const subject = options.subject || 'Welcome to La Maison - Your Login Credentials';
  const fromName = options.fromName || 'La Maison';

  const html = options.html || `
    <p>Hello,</p>
    <p>Your account has been created successfully.</p>
    <ul>
      <li><strong>Username:</strong> ${username}</li>
      <li><strong>Password:</strong> ${password}</li>
    </ul>
    <p>Please login at your earliest convenience.</p>
    <p>Regards,<br>La Maison Team</p>
  `;

  const raw = buildRawMessage(recipientEmail, subject, html, fromName);
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

  return gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });
}

module.exports = { sendLoginCredentials };
