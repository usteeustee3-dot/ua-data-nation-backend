const axios = require('axios');

exports.initializePayment = async (email, amount, reference) => {
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amount * 100, // Paystack uses kobo
        reference,
        callback_url: 'https://ua-data-nation.netlify.app' // You can change this to your Netlify link later
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.data.authorization_url;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Paystack initialization failed');
  }
};

exports.verifyPayment = async (reference) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` }
      }
    );
    return response.data.data.status === 'success';
  } catch (error) {
    throw new Error('Paystack verification failed');
  }
};