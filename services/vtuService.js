const MODE = process.env.VTU_MODE || 'mock';
const delay = (ms) => new Promise(r => setTimeout(r, ms));

exports.buyData = async ({ network, plan, phone }) => {
  if (MODE === 'mock') { await delay(500); return { success: true, reference: `MOCK-DATA-${Date.now()}` }; }
  throw new Error('Live VTU not configured');
};

exports.buyAirtime = async ({ network, amount, phone }) => {
  if (MODE === 'mock') { await delay(500); return { success: true, reference: `MOCK-AIR-${Date.now()}` }; }
  throw new Error('Live VTU not configured');
};

exports.buyExamPin = async ({ examType, quantity }) => {
  if (MODE === 'mock') {
    await delay(700);
    const pins = Array.from({ length: quantity }, (_, i) => `${examType}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    return { success: true, pins };
  }
  throw new Error('Live VTU not configured');
};

exports.payElectricity = async ({ disco, meterNumber, amount }) => {
  if (MODE === 'mock') {
    await delay(700);
    const token = Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join('');
    return { success: true, token: token.match(/.{4}/g).join('-') };
  }
  throw new Error('Live VTU not configured');
};