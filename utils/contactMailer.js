import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendContactMail = async ({ name, email, message }) => {
  const mailOptions = {
    from: `"CarveLane Contact" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER, // You receive the message
    subject: `New Contact Form Submission from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
  };

  await transporter.sendMail(mailOptions);
};
