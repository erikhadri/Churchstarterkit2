const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Enable CORS and JSON parsing
app.use(cors({
  origin: '*' // Allow all origins for simplicity; restrict in production
}));
app.use(express.json());

// Log all incoming requests with timestamps
app.use((req, res, next) => {
  console.log('Incoming request at', new Date().toISOString(), ':', req.method, req.url, req.body);
  next();
});

// Environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mongo:Milano@cluster0.fpuk0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const GMAIL_USER = process.env.GMAIL_USER || 'erikhadri97@gmail.com';
const GMAIL_PASS = process.env.GMAIL_PASS || 'xkjl fgwe mhmw klfq'; // Update this if you regenerated
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB at', new Date().toISOString()))
  .catch(err => console.error('MongoDB connection error at', new Date().toISOString(), ':', err.message || err));

// Define a schema for contact form submissions
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  message: String,
  date: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

// GET route for root
app.get('/', (req, res) => {
  res.send('Welcome to the Christian Starter Kit Server! Use the contact form to send messages.');
});

// POST route for sending emails and storing in MongoDB
app.post('/send-email', async (req, res) => {
  const { name, email, subject, message } = req.body;

  console.log('Received form data in backend at', new Date().toISOString(), ':', { name, email, subject, message });

  // Validate all fields
  if (!name || !email || !subject || !message) {
    console.error('Missing or invalid fields at', new Date().toISOString(), ':', req.body);
    return res.status(400).json({ error: 'All fields (name, email, subject, message) are required' });
  }

  try {
    // Store in MongoDB
    const newContact = new Contact({ name, email, subject, message });
    await newContact.save();
    console.log('Data saved to MongoDB successfully at', new Date().toISOString());

    // Create Nodemailer transporter with detailed logging
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false // Allow for testing; remove for production
      }
    });

    // Test the connection before sending
    await transporter.verify((error, success) => {
      if (error) {
        console.error('Nodemailer connection error at', new Date().toISOString(), ':', error.message);
        throw new Error('Nodemailer connection failed: ' + error.message);
      } else {
        console.log('Nodemailer connection verified at', new Date().toISOString());
      }
    });

    // Set up email details for form submission
    const mailOptions = {
      from: GMAIL_USER, // Sender (your Gmail)
      to: 'erik_hadrii@outlook.com', // Recipient
      subject: `Form Submission: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    };

    // Send the email with detailed logging
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully for form submission at', new Date().toISOString(), '. Response:', info.response);

    res.status(200).json({ success: 'Email sent successfully and data saved!' });

  } catch (error) {
    console.error('Error in /send-email at', new Date().toISOString(), ':', error.message || error.stack || error);
    if (error.message.includes('Invalid login') || error.message.includes('535')) {
      console.error('Gmail authentication failed. Check credentials and 2-Step Verification.');
    }
    res.status(500).json({ error: 'Error sending email or saving to database: ' + (error.message || error) });
  }
});

// Start the server (no automatic test email)
app.listen(PORT, () => {
  console.log('Server running on port', PORT, 'at', new Date().toISOString());
});

// Keep the process alive
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception at', new Date().toISOString(), ':', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at', new Date().toISOString(), 'at:', promise, 'reason:', reason);
});