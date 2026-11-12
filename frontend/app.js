const API = 'https://ua-data-nation-backend.onrender.com/api';
let token = localStorage.getItem('ua_token');
let currentUser = null;

const $ = (id) => document.getElementById(id);
const fmt = (n) => '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 });

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    $('loginForm').classList.toggle('hidden', !isLogin);
    $('registerForm').classList.toggle('hidden', isLogin);
    $('verifyForm').classList.add('hidden');
    $('authMsg').textContent = ""; 
  };
});

$('loginForm').onsubmit = async (e) => {
  e.preventDefault();
  $('authMsg').textContent = "Logging in...";
  try {
    const data = await api('/auth/login', { 
      method: 'POST', 
      body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }) 
    });
    token = data.token; 
    localStorage.setItem('ua_token', token); 
    currentUser = data.user; 
    showDashboard();
  } catch (err) { 
    $('authMsg').textContent = err.message; 
  }
};

$('registerForm').onsubmit = async (e) => {
  e.preventDefault();
  $('authMsg').textContent = "Processing... Please wait up to 60 seconds for Render to wake up.";
  
  try {
    const data = await api('/auth/register', { 
      method: 'POST', 
      body: JSON.stringify({ fullName: $('regName').value, email: $('regEmail').value, phone: $('regPhone').value, password: $('regPassword').value }) 
    });
    
    alert(data.message);
    $('registerForm').style.display = 'none'; 
    $('verifyForm').classList.remove('hidden');
    $('verifyForm').style.display = 'block';
    window.tempEmail = $('regEmail').value;
    $('authMsg').textContent = ""; 

  } catch (err) { 
    if (err.message.includes('already exists')) {
        alert("Account already exists. Please enter the verification code from your email.");
        $('registerForm').style.display = 'none';
        $('verifyForm').classList.remove('hidden');
        $('verifyForm').style.display = 'block';
        window.tempEmail = $('regEmail').value;
        $('authMsg').textContent = ""; 
    } else {
        $('authMsg').textContent = err.message; 
    }
  }
};

$('verifyForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    const data = await api('/auth/verify', { 
      method: 'POST', 
      body: JSON.stringify({ email: window.tempEmail, code: $('verifyCode').value }) 
    });
    
    alert(data.message);
    document.querySelector('[data-tab="login"]').click();
    $('verifyForm').style.display = 'none'; 
    $('verifyForm').classList.add('hidden');
    $('loginForm').classList.remove('hidden');
    
  } catch (err) { alert(err.message); }
};

$('logoutBtn').onclick = () => { localStorage.removeItem('ua_token'); location.reload(); };

async function showDashboard() {
  $('authScreen').classList.remove('active');
  $('dashboard').classList.add('active');
  
  // If currentUser is null (e.g., after a page refresh), fetch from backend
  if (!currentUser) {
    try { 
      currentUser = await api('/auth/me'); 
    } catch { 
      return $('logoutBtn').click(); 
    }
  }
  
  $('userName').textContent = `Hello, ${currentUser.fullName.split(' ')[0]} 👋`;
  
  // THIS IS THE FIX: Check for admin role and show the button
  if (currentUser.role === 'admin') {
    $('adminSection').style.display = 'block';
  } else {
    $('adminSection').style.display = 'none';
  }

  refreshBalance(); 
  loadTransactions();
}

async function refreshBalance() {
  try { const { balance } = await api('/wallet/balance'); $('walletBalance').textContent = fmt(balance); } catch {}
}

async function loadTransactions() {
  try {
    const list = await api('/wallet/transactions');
    $('txList').innerHTML = list.map(tx => `
      <div class="tx-item">
        <div><div class="tx-type">${tx.type.replace('_', ' ')}</div><small style="color:#666">${new Date(tx.createdAt).toLocaleDateString()}</small></div>
        <div style="text-align:right">
          <div class="tx-amount">${fmt(tx.amount)}</div>
          <span class="tx-status ${tx.status}">${tx.status}</span>
        </div>
      </div>
    `).join('') || '<p style="color:#666;font-size:13px">No transactions yet.</p>';
  } catch {}
}

function openModal(html) { $('modalBody').innerHTML = html; $('modal').classList.remove('hidden'); }
$('modalClose').onclick = () => $('modal').classList.add('hidden');

$('fundBtn').onclick = () => {
  openModal(`<h3>Fund Wallet</h3><input type="number" id="fundAmount" placeholder="Amount (min ₦100)"><button onclick="fundWallet()">Fund Now</button>`);
};

window.fundWallet = async () => {
  const amount = Number($('fundAmount').value);
  if (amount < 100) return alert('Minimum ₦100');
  try {
    await api('/wallet/fund', { method: 'POST', body: JSON.stringify({ amount }) });
    $('modal').classList.add('hidden'); alert('Wallet funded!'); refreshBalance(); loadTransactions();
  } catch (err) { alert(err.message); }
};

document.querySelectorAll('.service-card').forEach(card => {
  card.onclick = () => {
    const service = card.dataset.service;
    if (service === 'data') openModal(`<h3>Buy Data</h3>
      <select id="net"><option>MTN</option><option>AIRTEL</option><option>GLO</option><option>9MOBILE</option></select>
      <select id="plan"><option value="mtn-1gb">1GB - ₦300</option><option value="mtn-2gb">2GB - ₦600</option></select>
      <input type="tel" id="phone" placeholder="Phone Number">
      <button onclick="buyData()">Buy Now</button>`);
    if (service === 'airtime') openModal(`<h3>Buy Airtime</h3>
      <select id="net"><option>MTN</option><option>AIRTEL</option><option>GLO</option><option>9MOBILE</option></select>
      <input type="number" id="amt" placeholder="Amount (min ₦50)">
      <input type="tel" id="phone" placeholder="Phone Number">
      <button onclick="buyAirtime()">Buy Now</button>`);
    if (service === 'exam') openModal(`<h3>Exam Pin</h3>
      <select id="examType"><option value="WAEC">WAEC - ₦3,500</option><option value="NECO">NECO - ₦1,200</option><option value="JAMB">JAMB - ₦5,500</option></select>
      <button onclick="buyExam()">Buy Now</button>`);
    if (service === 'electricity') openModal(`<h3>Electricity</h3>
      <select id="disco"><option>IKEDC</option><option>EKEDC</option><option>AEDC</option></select>
      <input type="text" id="meter" placeholder="Meter Number">
      <input type="number" id="amt" placeholder="Amount (min ₦500)">
      <button onclick="payElectricity()">Pay Now</button>`);
  };
});

window.buyData = async () => {
  try {
    await api('/data/buy', { method: 'POST', body: JSON.stringify({ network: $('net').value, planId: $('plan').value, phone: $('phone').value }) });
    $('modal').classList.add('hidden'); alert('Data purchased successfully!'); refreshBalance(); loadTransactions();
  } catch (err) { alert(err.message); }
};

window.buyAirtime = async () => {
  try {
    await api('/airtime/buy', { method: 'POST', body: JSON.stringify({ network: $('net').value, amount: Number($('amt').value), phone: $('phone').value }) });
    $('modal').classList.add('hidden'); alert('Airtime purchased!'); refreshBalance(); loadTransactions();
  } catch (err) { alert(err.message); }
};

window.buyExam = async () => {
  try {
    const res = await api('/exam/buy', { method: 'POST', body: JSON.stringify({ examType: $('examType').value, quantity: 1 }) });
    $('modal').classList.add('hidden'); alert('PIN: ' + res.pins[0]); refreshBalance(); loadTransactions();
  } catch (err) { alert(err.message); }
};

window.payElectricity = async () => {
  try {
    const res = await api('/electricity/pay', { method: 'POST', body: JSON.stringify({ disco: $('disco').value, meterNumber: $('meter').value, meterType: 'prepaid', amount: Number($('amt').value) }) });
    $('modal').classList.add('hidden'); alert('Token: ' + res.token); refreshBalance(); loadTransactions();
  } catch (err) { alert(err.message); }
};

window.openAdmin = async () => {
  try {
    const stats = await api('/admin/stats');
    openModal(`
      <h3>👑 Admin Dashboard</h3>
      <div style="margin-bottom: 10px;"><strong>Total Users:</strong> ${stats.users}</div>
      <div style="margin-bottom: 10px;"><strong>Total Transactions:</strong> ${stats.transactions}</div>
      <div style="margin-bottom: 10px;"><strong>Total Wallet Balances:</strong> ₦${stats.totalBalance}</div>
      <button onclick="$('modal').classList.add('hidden')">Close</button>
    `);
  } catch (err) { alert(err.message); }
};

if (token) showDashboard();