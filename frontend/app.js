const API = 'https://ua-data-nation-backend.onrender.com/api';
let token = localStorage.getItem('ua_token');
let currentUser = null;
let isBalanceHidden = false;
let actualBalance = 0;

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
  } catch (err) { $('authMsg').textContent = err.message; }
};

$('registerForm').onsubmit = async (e) => {
  e.preventDefault();
  $('authMsg').textContent = "Processing... Please wait up to 60 seconds.";
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
        alert("Account already exists. Please verify your email.");
        $('registerForm').style.display = 'none';
        $('verifyForm').classList.remove('hidden');
        $('verifyForm').style.display = 'block';
        window.tempEmail = $('regEmail').value;
        $('authMsg').textContent = ""; 
    } else { $('authMsg').textContent = err.message; }
  }
};

$('verifyForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    const data = await api('/auth/verify', { method: 'POST', body: JSON.stringify({ email: window.tempEmail, code: $('verifyCode').value }) });
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
  
  if (!currentUser) {
    try { currentUser = await api('/auth/me'); } catch { return $('logoutBtn').click(); }
  }
  
  $('userName').textContent = currentUser.fullName.split(' ')[0];

  if (currentUser.accountNumber) {
    $('userAccountNumber').textContent = `${currentUser.bankName || 'UA Wallet'}: ${currentUser.accountNumber}`;
  }

  if (currentUser.role === 'admin') $('adminSection').style.display = 'block';
  else $('adminSection').style.display = 'none';

  refreshBalance(); loadTransactions();
}

async function refreshBalance() {
  try { 
    const { balance } = await api('/wallet/balance'); 
    actualBalance = balance;
    updateBalanceDisplay();
  } catch {}
}

function updateBalanceDisplay() {
  $('walletBalance').textContent = isBalanceHidden ? '₦****' : fmt(actualBalance);
}

async function loadTransactions() {
  try {
    const list = await api('/wallet/transactions');
    $('txList').innerHTML = list.map(tx => `
      <div class="tx-item">
        <div><div class="tx-type">${tx.type.replace('_', ' ')}</div><small style="color:#666">${new Date(tx.createdAt).toLocaleDateString()}</small></div>
        <div style="text-align:right"><div class="tx-amount">${fmt(tx.amount)}</div><span class="tx-status ${tx.status}">${tx.status}</span></div>
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
    const data = await api('/wallet/fund', { method: 'POST', body: JSON.stringify({ amount }) });
    window.location.href = data.url; 
  } catch (err) { alert(err.message); }
};

$('toggleBalance').onclick = () => {
  isBalanceHidden = !isBalanceHidden;
  updateBalanceDisplay();
  $('toggleBalance').textContent = isBalanceHidden ? '👁️' : '👁️‍🗨️';
};

$('refreshBalanceBtn').onclick = () => {
  $('refreshBalanceBtn').style.transform = 'rotate(360deg)';
  setTimeout(() => $('refreshBalanceBtn').style.transform = 'rotate(0deg)', 500);
  refreshBalance();
};

// GLOBAL CLICK LISTENER FOR ALL SERVICES
document.addEventListener('click', function(e) {
  const card = e.target.closest('.service-card');
  if (card) {
    const service = card.dataset.service;
    if (!service) return; 

    if (service === 'data') openModal(`<h3>Buy Data</h3><select id="net"><option>MTN</option><option>AIRTEL</option><option>GLO</option><option>9MOBILE</option></select><select id="plan"><option value="mtn-1gb">1GB - ₦300</option><option value="mtn-2gb">2GB - ₦600</option></select><input type="tel" id="phone" placeholder="Phone Number"><button onclick="buyData()">Buy Now</button>`);
    if (service === 'airtime') openModal(`<h3>Buy Airtime</h3><select id="net"><option>MTN</option><option>AIRTEL</option><option>GLO</option><option>9MOBILE</option></select><input type="number" id="amt" placeholder="Amount (min ₦50)"><input type="tel" id="phone" placeholder="Phone Number"><button onclick="buyAirtime()">Buy Now</button>`);
    if (service === 'exam') openModal(`<h3>Exam Pin</h3><select id="examType"><option value="WAEC">WAEC - ₦3,500</option><option value="NECO">NECO - ₦1,200</option><option value="JAMB">JAMB - ₦5,500</option></select><button onclick="buyExam()">Buy Now</button>`);
    if (service === 'electricity') openModal(`<h3>Electricity</h3><select id="disco"><option>IKEDC</option><option>EKEDC</option><option>AEDC</option></select><input type="text" id="meter" placeholder="Meter Number"><input type="number" id="amt" placeholder="Amount (min ₦500)"><button onclick="payElectricity()">Pay Now</button>`);

    if (service === 'cable') openModal(`<h3>Cable TV</h3><select id="cableProvider" onchange="updateCablePlans()"><option value="DSTV">DStv</option><option value="GOTV">GOtv</option></select><select id="cablePlan"><option value="dstv-padi">DStv Padi - ₦2,150</option><option value="dstv-yanga">DStv Yanga - ₦2,950</option></select><input type="text" id="smartcard" placeholder="Smartcard Number"><button onclick="buyCable()">Subscribe Now</button>`);
    
    // NEW SERVICES
    if (service === 'earn') openModal(`<h3>Earn (Referral)</h3><p style="margin-bottom:15px;">Claim a mock ₦500 referral bonus!</p><button onclick="claimEarn()">Claim Bonus Now</button>`);
    if (service === 'cash-airtime') openModal(`<h3>Cash Airtime</h3><select id="cashNet"><option>MTN</option><option>AIRTEL</option></select><input type="number" id="cashAmt" placeholder="Airtime Amount (e.g. 1000)"><button onclick="convertAirtime()">Convert to Cash (80%)</button>`);
    if (service === 'data-card') openModal(`<h3>Data Card</h3><select id="dcNet"><option>MTN</option><option>AIRTEL</option></select><select id="dcPlan"><option value="1GB">1GB - ₦300</option><option value="2GB">2GB - ₦600</option></select><input type="tel" id="dcPhone" placeholder="Recipient Phone"><button onclick="buyDataCard()">Buy Data Card</button>`);
    if (service === 'recharge-card') openModal(`<h3>Recharge Card</h3><select id="rcNet"><option>MTN</option><option>AIRTEL</option></select><input type="number" id="rcAmt" placeholder="Amount (e.g. 100)"><button onclick="buyRechargeCard()">Generate PIN</button>`);
  }
});

window.updateCablePlans = () => {
  const provider = $('cableProvider').value;
  const planSelect = $('cablePlan');
  if (provider === 'DSTV') {
    planSelect.innerHTML = `<option value="dstv-padi">DStv Padi - ₦2,150</option><option value="dstv-yanga">DStv Yanga - ₦2,950</option><option value="dstv-confam">DStv Confam - ₦5,300</option><option value="dstv-compact">DStv Compact - ₦9,000</option>`;
  } else {
    planSelect.innerHTML = `<option value="gotv-smallie">GOtv Smallie - ₦1,100</option><option value="gotv-jinja">GOtv Jinja - ₦2,250</option><option value="gotv-jolli">GOtv Jolli - ₦3,300</option><option value="gotv-max">GOtv Max - ₦4,850</option>`;
  }
};

// --- API CALLS FOR ALL SERVICES ---
window.buyData = async () => { try { await api('/data/buy', { method: 'POST', body: JSON.stringify({ network: $('net').value, planId: $('plan').value, phone: $('phone').value }) }); $('modal').classList.add('hidden'); alert('Data purchased!'); refreshBalance(); loadTransactions(); } catch (err) { alert(err.message); } };
window.buyAirtime = async () => { try { await api('/airtime/buy', { method: 'POST', body: JSON.stringify({ network: $('net').value, amount: Number($('amt').value), phone: $('phone').value }) }); $('modal').classList.add('hidden'); alert('Airtime purchased!'); refreshBalance(); loadTransactions(); } catch (err) { alert(err.message); } };
window.buyExam = async () => { try { const res = await api('/exam/buy', { method: 'POST', body: JSON.stringify({ examType: $('examType').value, quantity: 1 }) }); $('modal').classList.add('hidden'); alert('PIN: ' + res.pins[0]); refreshBalance(); loadTransactions(); } catch (err) { alert(err.message); } };
window.payElectricity = async () => { try { const res = await api('/electricity/pay', { method: 'POST', body: JSON.stringify({ disco: $('disco').value, meterNumber: $('meter').value, meterType: 'prepaid', amount: Number($('amt').value) }) }); $('modal').classList.add('hidden'); alert('Token: ' + res.token); refreshBalance(); loadTransactions(); } catch (err) { alert(err.message); } };

window.buyCable = async () => { try { await api('/cable/pay', { method: 'POST', body: JSON.stringify({ provider: $('cableProvider').value, planId: $('cablePlan').value, smartcard: $('smartcard').value }) }); $('modal').classList.add('hidden'); alert('Cable TV subscribed!'); refreshBalance(); loadTransactions(); } catch (err) { alert(err.message); } };
window.claimEarn = async () => { try { const res = await api('/services/earn', { method: 'POST' }); $('modal').classList.add('hidden'); alert(res.message); refreshBalance(); loadTransactions(); } catch (err) { alert(err.message); } };
window.convertAirtime = async () => { try { const res = await api('/services/cash-airtime', { method: 'POST', body: JSON.stringify({ network: $('cashNet').value, amount: Number($('cashAmt').value) }) }); $('modal').classList.add('hidden'); alert(res.message); refreshBalance(); loadTransactions(); } catch (err) { alert(err.message); } };
window.buyDataCard = async () => { try { await api('/services/data-card', { method: 'POST', body: JSON.stringify({ network: $('dcNet').value, plan: $('dcPlan').value, phone: $('dcPhone').value }) }); $('modal').classList.add('hidden'); alert('Data card generated!'); refreshBalance(); loadTransactions(); } catch (err) { alert(err.message); } };
window.buyRechargeCard = async () => { try { const res = await api('/services/recharge-card', { method: 'POST', body: JSON.stringify({ network: $('rcNet').value, amount: Number($('rcAmt').value) }) }); $('modal').classList.add('hidden'); alert('PIN Generated: ' + res.pin); refreshBalance(); loadTransactions(); } catch (err) { alert(err.message); } };

window.openAdmin = async () => { try { const stats = await api('/admin/stats'); openModal(`<h3>👑 Admin Dashboard</h3><div><strong>Total Users:</strong> ${stats.users}</div><div><strong>Total Transactions:</strong> ${stats.transactions}</div><div><strong>Total Wallet Balances:</strong> ₦${stats.totalBalance}</div><button onclick="$('modal').classList.add('hidden')">Close</button>`); } catch (err) { alert(err.message); } };

window.openServices = () => { $('dashboard').classList.remove('active'); $('servicesScreen').classList.add('active'); };
window.closeServices = () => { $('servicesScreen').classList.remove('active'); $('dashboard').classList.add('active'); };

if (token) showDashboard();