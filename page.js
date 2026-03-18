'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU');
}

function statusBadge(status) {
  const map = {
    active: ['Активный', 'active'],
    soon: ['Скоро платёж', 'soon'],
    overdue: ['Просрочен', 'overdue'],
    closed: ['Закрыт', 'closed'],
  };
  const [label, cls] = map[status] || ['Активный', 'active'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

const emptyForm = {
  full_name: '',
  phone: '',
  guarantor_name: '',
  guarantor_phone: '',
  product_name: '',
  contract_number: '',
  total_amount: '',
  down_payment: '',
  monthly_payment: '',
  start_date: '',
  next_payment_date: '',
  end_date: '',
  notes: '',
};

export default function HomePage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState('login');
  const [auth, setAuth] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [paymentForm, setPaymentForm] = useState({ contract_id: '', amount: '', paid_at: '', method: 'Наличные', notes: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  async function loadData() {
    setLoading(true);
    const [{ data: contractData, error: contractError }, { data: paymentData, error: paymentError }] = await Promise.all([
      supabase.from('contracts_dashboard').select('*').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('paid_at', { ascending: false }),
    ]);

    if (contractError) setMessage(contractError.message);
    if (paymentError) setMessage(paymentError.message);
    setContracts(contractData || []);
    setPayments(paymentData || []);
    setLoading(false);
  }

  async function handleAuth(e) {
    e.preventDefault();
    setMessage('');
    const action = mode === 'login'
      ? supabase.auth.signInWithPassword({ email: auth.email, password: auth.password })
      : supabase.auth.signUp({ email: auth.email, password: auth.password });
    const { error } = await action;
    if (error) setMessage(error.message);
    else setMessage(mode === 'login' ? 'Вход выполнен.' : 'Аккаунт создан. Проверь почту, если включено подтверждение e-mail.');
  }

  async function handleCreateContract(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const payload = {
      ...form,
      total_amount: Number(form.total_amount || 0),
      down_payment: Number(form.down_payment || 0),
      monthly_payment: Number(form.monthly_payment || 0),
      user_id: session.user.id,
    };

    const { error } = await supabase.from('contracts').insert(payload);
    if (error) setMessage(error.message);
    else {
      setForm(emptyForm);
      setMessage('Клиент и договор сохранены.');
      await loadData();
    }
    setSaving(false);
  }

  async function handleAddPayment(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await supabase.from('payments').insert({
      contract_id: paymentForm.contract_id,
      amount: Number(paymentForm.amount || 0),
      paid_at: paymentForm.paid_at,
      method: paymentForm.method,
      notes: paymentForm.notes,
      user_id: session.user.id,
    });

    if (error) setMessage(error.message);
    else {
      setPaymentForm({ contract_id: '', amount: '', paid_at: '', method: 'Наличные', notes: '' });
      setMessage('Оплата добавлена.');
      await loadData();
    }
    setSaving(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const filteredContracts = contracts.filter((item) => {
    const hay = [item.full_name, item.phone, item.product_name, item.contract_number, item.guarantor_name].join(' ').toLowerCase();
    const okSearch = hay.includes(search.toLowerCase());
    const okFilter = filter === 'all' ? true : item.status === filter;
    return okSearch && okFilter;
  });

  const summary = useMemo(() => {
    const totalPortfolio = contracts.reduce((acc, row) => acc + Number(row.total_amount || 0), 0);
    const totalPaid = contracts.reduce((acc, row) => acc + Number(row.paid_total || 0), 0);
    const totalBalance = contracts.reduce((acc, row) => acc + Number(row.balance || 0), 0);
    const overdueCount = contracts.filter((row) => row.status === 'overdue').length;
    return { totalPortfolio, totalPaid, totalBalance, overdueCount };
  }, [contracts]);

  if (loading && !session) {
    return <div className="authShell"><div className="panel authCard">Загрузка...</div></div>;
  }

  if (!session) {
    return (
      <div className="authShell">
        <div className="panel authCard">
          <div className="brand">Rassrochka Pro<small>Серьёзный учёт рассрочек на Supabase + Vercel</small></div>
          <hr className="line" />
          <div className="tabs">
            <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Вход</button>
            <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Регистрация</button>
          </div>
          <form className="grid" onSubmit={handleAuth}>
            <input className="input" type="email" placeholder="E-mail" value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} required />
            <input className="input" type="password" placeholder="Пароль" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} required />
            <button className="btn" type="submit">{mode === 'login' ? 'Войти' : 'Создать аккаунт'}</button>
          </form>
          <p className="helper">После входа каждый пользователь видит только свои договоры и оплаты благодаря RLS в Supabase.</p>
          {message ? <p className="helper">{message}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">Rassrochka Pro<small>{session.user.email}</small></div>
        <div className="row">
          <button className="btn secondary" onClick={loadData}>Обновить</button>
          <button className="btn secondary" onClick={signOut}>Выйти</button>
        </div>
      </div>

      {message ? <div className="panel card" style={{ marginBottom: 16 }}>{message}</div> : null}

      <div className="grid stats" style={{ marginBottom: 16 }}>
        <div className="panel card kpi"><span className="label">Портфель договоров</span><span className="value">{formatMoney(summary.totalPortfolio)}</span></div>
        <div className="panel card kpi"><span className="label">Получено оплат</span><span className="value">{formatMoney(summary.totalPaid)}</span></div>
        <div className="panel card kpi"><span className="label">Остаток к получению</span><span className="value">{formatMoney(summary.totalBalance)}</span></div>
        <div className="panel card kpi"><span className="label">Просроченные</span><span className="value">{summary.overdueCount}</span></div>
      </div>

      <div className="split" style={{ marginBottom: 16 }}>
        <div className="panel card">
          <h2 className="sectionTitle">Добавить клиента и договор</h2>
          <form className="formGrid" onSubmit={handleCreateContract}>
            <input className="input" placeholder="ФИО клиента" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <input className="input" placeholder="Телефон" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="input" placeholder="ФИО поручителя" value={form.guarantor_name} onChange={(e) => setForm({ ...form, guarantor_name: e.target.value })} />
            <input className="input" placeholder="Телефон поручителя" value={form.guarantor_phone} onChange={(e) => setForm({ ...form, guarantor_phone: e.target.value })} />
            <input className="input" placeholder="Товар / услуга" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required />
            <input className="input" placeholder="Номер договора" value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} required />
            <input className="input" type="number" placeholder="Сумма договора" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} required />
            <input className="input" type="number" placeholder="Первоначальный взнос" value={form.down_payment} onChange={(e) => setForm({ ...form, down_payment: e.target.value })} />
            <input className="input" type="number" placeholder="Ежемесячный платёж" value={form.monthly_payment} onChange={(e) => setForm({ ...form, monthly_payment: e.target.value })} required />
            <input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            <input className="input" type="date" value={form.next_payment_date} onChange={(e) => setForm({ ...form, next_payment_date: e.target.value })} required />
            <input className="input" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            <textarea className="textarea" placeholder="Комментарий" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ gridColumn: '1 / -1' }} />
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить договор'}</button>
          </form>
        </div>

        <div className="grid">
          <div className="panel card">
            <h2 className="sectionTitle">Добавить оплату</h2>
            <form className="grid" onSubmit={handleAddPayment}>
              <select className="select" value={paymentForm.contract_id} onChange={(e) => setPaymentForm({ ...paymentForm, contract_id: e.target.value })} required>
                <option value="">Выбери договор</option>
                {contracts.map((row) => (
                  <option key={row.id} value={row.id}>{row.full_name} — {row.contract_number}</option>
                ))}
              </select>
              <input className="input" type="number" placeholder="Сумма оплаты" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
              <input className="input" type="date" value={paymentForm.paid_at} onChange={(e) => setPaymentForm({ ...paymentForm, paid_at: e.target.value })} required />
              <select className="select" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                <option>Наличные</option>
                <option>Перевод</option>
                <option>Карта</option>
              </select>
              <textarea className="textarea" placeholder="Комментарий к оплате" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Сохранение...' : 'Добавить оплату'}</button>
            </form>
          </div>

          <div className="panel card">
            <h2 className="sectionTitle">Последние оплаты</h2>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Сумма</th>
                    <th>Способ</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 8).map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.paid_at)}</td>
                      <td>{formatMoney(row.amount)}</td>
                      <td>{row.method}</td>
                    </tr>
                  ))}
                  {payments.length === 0 ? <tr><td colSpan="3" className="empty">Оплат пока нет</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="panel card">
        <div className="topbar" style={{ marginBottom: 16 }}>
          <h2 className="sectionTitle" style={{ margin: 0 }}>Клиенты и договоры</h2>
          <div className="row" style={{ flex: 1, justifyContent: 'flex-end' }}>
            <input className="input" style={{ maxWidth: 320 }} placeholder="Поиск по имени, телефону, товару, договору" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="select" style={{ maxWidth: 210 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="soon">Скоро платёж</option>
              <option value="overdue">Просроченные</option>
              <option value="closed">Закрытые</option>
            </select>
          </div>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Товар</th>
                <th>Договор</th>
                <th>Сумма</th>
                <th>Оплачено</th>
                <th>Остаток</th>
                <th>След. платёж</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.full_name}</strong><br />
                    <span className="helper">{row.phone || 'Телефон не указан'}</span><br />
                    <span className="helper">Поручитель: {row.guarantor_name || '—'}</span>
                  </td>
                  <td>{row.product_name}</td>
                  <td>
                    <strong>{row.contract_number}</strong><br />
                    <span className="helper">Старт: {formatDate(row.start_date)}</span>
                  </td>
                  <td>{formatMoney(row.total_amount)}</td>
                  <td>{formatMoney(row.paid_total)}</td>
                  <td>{formatMoney(row.balance)}</td>
                  <td>{formatDate(row.next_payment_date)}</td>
                  <td>{statusBadge(row.status)}</td>
                </tr>
              ))}
              {filteredContracts.length === 0 ? <tr><td colSpan="8" className="empty">Ничего не найдено</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
