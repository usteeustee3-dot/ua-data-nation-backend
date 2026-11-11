const axios = require('axios');

exports.sendVerificationCode = async (email, code) => {
  try {
    await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: 'UA Data Nation', email: 'usteeustee3@gmail.com' }, // Change this to the email you used for Brevo
      to: [{ email: email }],
      subject: 'Your Verification Code - UA Data Nation',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2>Welcome to UA Data Nation!</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #6c5ce7; letter-spacing: 5px;">${code}</h1>
          <p>Enter this code in the app to verify your account.</p>
        </div>
      `
    }, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Email failed:', error.response?.data || error.message);
    throw new Error('Could not send email');
  }
};