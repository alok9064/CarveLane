import express from 'express';
import { sendContactMail } from '../utils/contactMailer.js';

const router = express.Router();

router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).send('All fields are required.');
  }

  try {
    await sendContactMail({ name, email, message });
    req.session.successMessage = 'Your message has been sent successfully!';
    res.status(200, {success: true});
    res.redirect('/#contact-section');
    
    // res.send(`<script>alert("Message sent successfully!"); window.location.href = "/#contact-section";</script>`);
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send(`<script>alert("Failed to send message. Try again later."); window.location.href = "/#contact-section";</script>`);
  }
});

export default router;
