/**
 * Simple HR Candidate Email Response Tool - Backend (Node.js + Express)
 * - Serves the static frontend from /public
 * - Exposes POST /api/send-email to send emails via SMTP using Nodemailer
 *
 * Usage:
 *   1) Copy .env.example to .env and fill in your SMTP credentials.
 *   2) npm install
 *   3) npm start
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Predefined templates (plain text)
const TEMPLATES = {
  selected: `Dear [Candidate Name],

We are pleased to inform you that you have been selected for the position of [Position].
Please reply to this email to confirm your acceptance.

Best regards,
HR Team`,
  rejected: `Dear [Candidate Name],

Thank you for applying for the position of [Position].
We regret to inform you that we have decided to move forward with other candidates.

Best regards,
HR Team`
};

function buildMessage({status, name, position}) {
  const key = status === 'selected' ? 'selected' : 'rejected';
  const body = TEMPLATES[key]
    .replaceAll('[Candidate Name]', name)
    .replaceAll('[Position]', position);
  const subject = key === 'selected'
    ? `Application Status: Selected - ${position}`
    : `Application Status: Update - ${position}`;
  return { subject, body };
}

// Basic email format check
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { status, name, email, position } = req.body || {};
    // Validate input
    if (!status || !['selected','rejected'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status. Must be "selected" or "rejected".' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ ok: false, error: 'Candidate name is required.' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'A valid candidate email is required.' });
    }
    if (!position || !position.trim()) {
      return res.status(400).json({ ok: false, error: 'Position is required.' });
    }

    // Build email content
    const { subject, body } = buildMessage({ status, name: name.trim(), position: position.trim() });

    // Setup transporter (SMTP)
   if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  throw new Error('Missing SMTP config in environment variables');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: (process.env.SMTP_SECURE || 'true') === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls:{
    rejectUnauthorized:false
  }
});


    // Verify transporter configuration
    await transporter.verify();

    const from = process.env.MAIL_FROM || 'HR Team <hr@example.com>';

    const info = await transporter.sendMail({
      from,
      to: email,
      subject,
      text: body
      // If you want HTML, you can add: html: body.replace(/\n/g, '<br>')
    });

    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email send failed:', err);
    // Avoid leaking secrets in error messages
    return res.status(500).json({ ok: false, error: 'Failed to send email. Check server logs and SMTP settings.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
