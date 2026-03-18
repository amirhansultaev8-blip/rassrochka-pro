const SUPABASE_URL = 'PASTE_SUPABASE_URL_HERE';
const SUPABASE_KEY = 'PASTE_SUPABASE_PUBLISHABLE_KEY_HERE';

const authCard = document.getElementById('authCard');
const appCard = document.getElementById('appCard');
const authMsg = document.getElementById('authMsg');
const logoutBtn = document.getElementById('logoutBtn');
const clientsBody = document.getElementById('clientsBody');
const searchInput = document.getElementById('search');

let supabase;
let clients = [];

function rub(v){ return new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(Number(v||0)); }

function ensureClient() {
  if (!SUPABASE_URL.startsWith('https://') || SUPABASE_KEY.includes('PASTE_')) {
    authMsg.textContent = 'Сначала открой файл app.js и вставь свои ключи Supabase.';
    return false;
  }
  if (!supabase) supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return true;
}

async function checkAuth() {
  if (!ensureClient()) return;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  authCard.classList.toggle('hidden', !!session);
  appCard.classList.toggle('hidden', !session);
  logoutBtn.classList.toggle('hidden', !session);
  if (session) await loadClients();
}

async function signUp() {
  if (!ensureClient()) return;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const { error } = await supabase.auth.signUp({ email, password });
  authMsg.textContent = error ? error.message : 'Проверь почту и подтверди регистрацию.';
}

async function signIn() {
  if (!ensureClient()) return;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  authMsg.textContent = error ? error.message : 'Успешный вход';
  await checkAuth();
}

async function signOut() {
  await supabase.auth.signOut();
  await checkAuth();
}

async function loadClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('id,name,phone,product,guarantor,total_price,monthly_payment,next_payment_date,contract_number,payments(amount)')
    .order('created_at', { ascending: false });
  if (error) { alert(error.message); return; }
  clients = data || [];
  renderClients();
  renderStats();
}

function renderStats() {
  const total = clients.reduce((s,c)=>s+Number(c.total_price||0),0);
  const paid = clients.reduce((s,c)=>s+(c.payments||[]).reduce((a,p)=>a+Number(p.amount||0),0),0);
  document.getElementById('statClients').textContent = clients.length;
  document.getElementById('statTotal').textContent = rub(total);
  document.getElementById('statPaid').textContent = rub(paid);
  document.getElementById('statRest').textContent = rub(total-paid);
}

function renderClients() {
  clientsBody.innerHTML = '';
  const q = (searchInput.value || '').toLowerCase();
  const filtered = clients.filter(c => [c.name,c.phone,c.product,c.contract_number].join(' ').toLowerCase().includes(q));
  filtered.forEach(client => {
    const node = document.getElementById('clientRowTpl').content.cloneNode(true);
    const paid = (client.payments||[]).reduce((s,p)=>s+Number(p.amount||0),0);
    const rest = Number(client.total_price||0) - paid;
    node.querySelector('.name').textContent = client.name || '-';
    node.querySelector('.phone').textContent = client.phone || '-';
    node.querySelector('.product').textContent = client.product || '-';
    node.querySelector('.total').textContent = rub(client.total_price);
    node.querySelector('.paid').textContent = rub(paid);
    node.querySelector('.rest').textContent = rub(rest);
    node.querySelector('.nextDate').textContent = client.next_payment_date || '-';
    const input = node.querySelector('.paymentInput');
    node.querySelector('.addPaymentBtn').addEventListener('click', async () => {
      const amount = Number(input.value || 0);
      if (!amount) return alert('Введи сумму оплаты');
      const { error } = await supabase.from('payments').insert({ client_id: client.id, amount });
      if (error) return alert(error.message);
      input.value = '';
      await loadClients();
    });
    clientsBody.appendChild(node);
  });
}

async function saveClient() {
  const payload = {
    name: document.getElementById('clientName').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    product: document.getElementById('product').value.trim(),
    guarantor: document.getElementById('guarantor').value.trim(),
    total_price: Number(document.getElementById('totalPrice').value || 0),
    monthly_payment: Number(document.getElementById('monthlyPayment').value || 0),
    next_payment_date: document.getElementById('nextPaymentDate').value || null,
    contract_number: document.getElementById('contractNumber').value.trim()
  };
  if (!payload.name) return alert('Напиши ФИО клиента');
  const { error } = await supabase.from('clients').insert(payload);
  if (error) return alert(error.message);
  document.querySelectorAll('#appCard input').forEach(i => { if (i.id !== 'search') i.value = ''; });
  await loadClients();
}

document.getElementById('signUpBtn').onclick = signUp;
document.getElementById('signInBtn').onclick = signIn;
document.getElementById('saveClientBtn').onclick = saveClient;
logoutBtn.onclick = signOut;
searchInput.oninput = renderClients;

checkAuth();
