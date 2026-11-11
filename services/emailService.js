const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendVerificationCode = async (email, code) => {
  const mailOptions = {
    from: `"UA Data Nation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Verification Code - UA Data Nation',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h2>Welcome to UA Data Nation!</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #6c5ce7; letter-spacing: 5px;">${code}</h1>
        <p>Enter this code in the app to verify your account.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};