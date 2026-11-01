(() => {
  'use strict';

  const KEYS = { transactions: 'ledger.transactions.v2', theme: 'ledger.theme', currency: 'ledger.currency', budgets: 'ledger.budgets' };
  const CATEGORIES = {
    expense: ['Food & dining', 'Transport', 'Shopping', 'Bills & utilities', 'Entertainment', 'Health', 'Education', 'Travel', 'Home', 'Other'],
    income: ['Salary', 'Freelance', 'Business', 'Investments', 'Gift', 'Other']
  };
  const COLORS = ['#6d6af6', '#f5a45d', '#50b8a6', '#ec6a83', '#73a4e8', '#b27ad4', '#e6c25a', '#58a9bd', '#9aa3b2', '#d88968'];
  const $ = (selector) => document.querySelector(selector);
  const els = {
    balance: $('#total-balance'), income: $('#month-income'), expenses: $('#month-expenses'), savings: $('#savings-rate'), savingsCaption: $('#savings-caption'),
    form: $('#transaction-form'), dialog: $('#transaction-dialog'), budgetDialog: $('#budget-dialog'), type: $('#transaction-type'), id: $('#transaction-id'), description: $('#description'), amount: $('#amount'), date: $('#date'), category: $('#category'), note: $('#note'), list: $('#transaction-list'), empty: $('#empty-state'), search: $('#search-input'), typeFilter: $('#type-filter'), categoryFilter: $('#category-filter'), sort: $('#sort-select'), month: $('#month-select'), currency: $('#currency-select'),
    donut: $('#donut-chart'), chartTotal: $('#chart-total'), legend: $('#category-legend'), budget: $('#budget-amount'), budgetInput: $('#budget-input'), budgetProgress: $('#budget-progress'), budgetSpent: $('#budget-spent'), budgetRemaining: $('#budget-remaining'), budgetHint: $('#budget-hint'), toast: $('#toast-container'),
  };

  const today = new Date();
  let transactions = readTransactions();
  let budgets = readObject(KEYS.budgets);
  let currency = localStorage.getItem(KEYS.currency) || 'LKR';
  let selectedMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  let selectedType = 'expense';

  function readObject(key) { try { const value = JSON.parse(localStorage.getItem(key) || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; } }
  function readTransactions() {
    try {
      const current = JSON.parse(localStorage.getItem(KEYS.transactions) || 'null');
      if (Array.isArray(current)) return current.filter(isValidTransaction).map(normalizeTransaction);
      const legacy = JSON.parse(localStorage.getItem('transactions') || '[]');
      return Array.isArray(legacy) ? legacy.filter(isValidTransaction).map(normalizeTransaction) : [];
    } catch { return []; }
  }
  function isValidTransaction(item) { return item && (item.type === 'income' || item.type === 'expense') && Number.isFinite(Number(item.amount)) && Number(item.amount) > 0 && typeof item.date === 'string'; }
  function normalizeTransaction(item) { return { id: String(item.id ?? crypto.randomUUID()), type: item.type, amount: Number(item.amount), date: item.date, description: String(item.description || 'Untitled'), category: String(item.category || 'Other'), note: String(item.note || '') }; }
  function persist() { localStorage.setItem(KEYS.transactions, JSON.stringify(transactions)); localStorage.setItem(KEYS.budgets, JSON.stringify(budgets)); }
  function money(value, compact = false) {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, notation: compact ? 'compact' : 'standard', maximumFractionDigits: compact ? 1 : 2 }).format(Number(value) || 0); }
    catch { return `${currency} ${(Number(value) || 0).toFixed(2)}`; }
  }
  function monthTransactions() { return transactions.filter((t) => t.date.startsWith(selectedMonth)); }
  function dateLabel(value) { const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date); }
  function monthLabel(month = selectedMonth, options = { month: 'long', year: 'numeric' }) { const [year, mon] = month.split('-').map(Number); return new Intl.DateTimeFormat(undefined, options).format(new Date(year, mon - 1, 1)); }

  function initialize() {
    $('#today-label').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(today).toUpperCase();
    els.month.value = selectedMonth; els.currency.value = currency;
    const theme = localStorage.getItem(KEYS.theme) || 'light'; document.documentElement.dataset.theme = theme; updateThemeButton(theme);
    $('#transaction-form').addEventListener('submit', saveTransaction);
    $('#month-select').addEventListener('change', () => { if (els.month.value) { selectedMonth = els.month.value; render(); } });
    $('#prev-month').addEventListener('click', () => moveMonth(-1)); $('#next-month').addEventListener('click', () => moveMonth(1));
    $('#currency-select').addEventListener('change', () => { currency = els.currency.value; localStorage.setItem(KEYS.currency, currency); render(); });
    $('#theme-toggle').addEventListener('click', () => { const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; localStorage.setItem(KEYS.theme, theme); updateThemeButton(theme); });
    $('#add-transaction-top').addEventListener('click', openNewTransaction); $('#empty-add').addEventListener('click', openNewTransaction);
    $('.dialog-close').addEventListener('click', () => els.dialog.close()); $('.dialog-cancel').addEventListener('click', () => els.dialog.close());
    $('.budget-close').addEventListener('click', () => els.budgetDialog.close()); $('.budget-cancel').addEventListener('click', () => els.budgetDialog.close());
    document.querySelectorAll('.type-tab').forEach((button) => button.addEventListener('click', () => selectType(button.dataset.type)));
    ['input', 'change'].forEach((event) => { els.search.addEventListener(event, renderTransactions); els.typeFilter.addEventListener(event, renderTransactions); els.categoryFilter.addEventListener(event, renderTransactions); els.sort.addEventListener(event, renderTransactions); });
    $('#edit-budget').addEventListener('click', openBudgetDialog); $('#budget-form').addEventListener('submit', saveBudget);
    $('#export-csv').addEventListener('click', exportCsv); $('#import-trigger').addEventListener('click', () => $('#import-file').click()); $('#import-file').addEventListener('change', importCsv);
    $('#clear-filters').addEventListener('click', clearFilters);
    $('#search-input').addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); els.search.focus(); } });
    renderCategoryOptions(); render();
  }
  function updateThemeButton(theme) { const dark = theme === 'dark'; $('#theme-icon').textContent = dark ? '☀' : '☾'; $('#theme-label').textContent = dark ? 'Light appearance' : 'Dark appearance'; document.querySelector('meta[name="theme-color"]').content = dark ? '#11131a' : '#f5f6f8'; }
  function moveMonth(amount) { const [year, month] = selectedMonth.split('-').map(Number); const date = new Date(year, month - 1 + amount, 1); selectedMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; els.month.value = selectedMonth; render(); }
  function render() { renderSummary(); renderChart(); renderBudget(); renderTransactions(); $('#chart-period').textContent = monthLabel(); }

  function renderSummary() {
    const data = monthTransactions();
    const income = data.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = data.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
    const rate = income ? ((income - expense) / income) * 100 : 0;
    els.balance.textContent = money(balance); els.income.textContent = money(income); els.expenses.textContent = money(expense); els.savings.textContent = `${Math.round(rate)}%`;
    els.savingsCaption.textContent = income ? (rate < 0 ? 'Spending is above income' : 'Income left after spending') : 'Add income to see your rate';
  }
  function renderChart() {
    const totals = new Map();
    monthTransactions().filter((t) => t.type === 'expense').forEach((t) => totals.set(t.category, (totals.get(t.category) || 0) + t.amount));
    const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]); const total = entries.reduce((sum, [, value]) => sum + value, 0);
    els.chartTotal.textContent = money(total, true);
    if (!total) { els.donut.style.background = 'conic-gradient(var(--chart-empty) 0deg 360deg)'; els.legend.innerHTML = '<div class="empty-chart">Your category breakdown will show up here.</div>'; return; }
    let cursor = 0; const arcs = entries.map(([, value], index) => { const start = cursor; cursor += (value / total) * 360; return `${COLORS[index % COLORS.length]} ${start}deg ${cursor}deg`; });
    els.donut.style.background = `conic-gradient(${arcs.join(',')})`;
    els.legend.innerHTML = entries.slice(0, 6).map(([name, value], index) => `<div class="legend-row"><span class="legend-swatch" style="--swatch:${COLORS[index % COLORS.length]}"></span><span class="legend-name">${escapeHtml(name)}</span><strong>${Math.round(value / total * 100)}%</strong><small>${money(value, true)}</small></div>`).join('');
  }
  function renderBudget() {
    const amount = Number(budgets[selectedMonth]) || 0; const spent = monthTransactions().filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    els.budget.textContent = money(amount, true); els.budgetSpent.textContent = `${money(spent, true)} spent`;
    if (!amount) { els.budgetProgress.style.width = '0%'; els.budgetProgress.classList.remove('over-budget'); els.budgetRemaining.textContent = 'Set a monthly limit'; els.budgetHint.textContent = 'A budget helps you stay intentional, one month at a time.'; return; }
    const ratio = spent / amount; els.budgetProgress.style.width = `${Math.min(ratio * 100, 100)}%`; els.budgetProgress.classList.toggle('over-budget', ratio >= 1);
    const remaining = amount - spent; els.budgetRemaining.textContent = remaining >= 0 ? `${money(remaining, true)} left` : `${money(Math.abs(remaining), true)} over`;
    els.budgetHint.textContent = ratio >= 1 ? 'You have reached your spending limit for this month.' : `${Math.max(0, Math.round((1 - ratio) * 100))}% of your budget is still available.`;
  }
  function renderTransactions() {
    const query = els.search.value.trim().toLowerCase(); const type = els.typeFilter.value; const category = els.categoryFilter.value;
    let filtered = monthTransactions().filter((t) => (type === 'all' || t.type === type) && (category === 'all' || t.category === category) && (!query || `${t.description} ${t.category} ${t.note}`.toLowerCase().includes(query)));
    const [key, direction] = els.sort.value.split('-'); filtered.sort((a, b) => key === 'amount' ? (a.amount - b.amount) * (direction === 'desc' ? -1 : 1) : a.date.localeCompare(b.date) * (direction === 'desc' ? -1 : 1));
    els.list.innerHTML = filtered.map((t) => `<tr><td><div class="transaction-name"><span class="transaction-symbol ${t.type}">${t.type === 'income' ? '↗' : '↘'}</span><div><strong>${escapeHtml(t.description)}</strong>${t.note ? `<small>${escapeHtml(t.note)}</small>` : ''}</div></div></td><td><span class="category-pill">${escapeHtml(t.category)}</span></td><td class="date-cell">${dateLabel(t.date)}</td><td><span class="type-pill ${t.type}">${t.type === 'income' ? 'Income' : 'Expense'}</span></td><td class="amount-cell ${t.type}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</td><td><div class="row-actions"><button class="row-action edit-action" type="button" data-id="${escapeAttr(t.id)}" aria-label="Edit ${escapeAttr(t.description)}">✎</button><button class="row-action delete-action" type="button" data-id="${escapeAttr(t.id)}" aria-label="Delete ${escapeAttr(t.description)}">×</button></div></td></tr>`).join('');
    els.empty.hidden = filtered.length > 0; $('#transaction-count').textContent = `${monthTransactions().length} ${monthTransactions().length === 1 ? 'transaction' : 'transactions'} in ${monthLabel()}`; $('#result-count').textContent = filtered.length ? `Showing ${filtered.length} of ${monthTransactions().length} transactions` : '';
    $('#clear-filters').hidden = !query && type === 'all' && category === 'all';
    els.list.querySelectorAll('.edit-action').forEach((button) => button.addEventListener('click', () => editTransaction(button.dataset.id)));
    els.list.querySelectorAll('.delete-action').forEach((button) => button.addEventListener('click', () => deleteTransaction(button.dataset.id)));
  }
  function renderCategoryOptions(keepFilter = true) {
    const previous = els.category.value; const typeCategories = CATEGORIES[selectedType];
    els.category.innerHTML = typeCategories.map((item) => `<option>${escapeHtml(item)}</option>`).join(''); if (typeCategories.includes(previous)) els.category.value = previous;
    const selected = keepFilter ? els.categoryFilter.value : 'all'; const all = [...new Set(transactions.map((t) => t.category).concat(Object.values(CATEGORIES).flat()))].sort();
    els.categoryFilter.innerHTML = '<option value="all">All categories</option>' + all.map((item) => `<option value="${escapeAttr(item)}">${escapeHtml(item)}</option>`).join(''); els.categoryFilter.value = [...els.categoryFilter.options].some((o) => o.value === selected) ? selected : 'all';
  }
  function selectType(type) { selectedType = type; els.type.value = type; document.querySelectorAll('.type-tab').forEach((button) => button.classList.toggle('active', button.dataset.type === type)); renderCategoryOptions(); }
  function openNewTransaction() { els.form.reset(); els.id.value = ''; $('#dialog-title').textContent = 'Add transaction'; $('#save-transaction').textContent = 'Save transaction'; els.date.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; selectType('expense'); els.dialog.showModal(); els.description.focus(); }
  function editTransaction(id) { const t = transactions.find((item) => item.id === id); if (!t) return; els.id.value = t.id; els.description.value = t.description; els.amount.value = t.amount; els.date.value = t.date; els.note.value = t.note; $('#dialog-title').textContent = 'Edit transaction'; $('#save-transaction').textContent = 'Save changes'; selectType(t.type); els.category.value = CATEGORIES[t.type].includes(t.category) ? t.category : 'Other'; els.dialog.showModal(); }
  function saveTransaction(event) {
    event.preventDefault(); const amount = Number(els.amount.value); if (!els.form.reportValidity() || !Number.isFinite(amount) || amount <= 0) return;
    const transaction = { id: els.id.value || crypto.randomUUID(), type: els.type.value, description: els.description.value.trim(), amount, date: els.date.value, category: els.category.value, note: els.note.value.trim() };
    if (!transaction.description) return;
    const index = transactions.findIndex((item) => item.id === transaction.id); if (index < 0) transactions.push(transaction); else transactions[index] = transaction;
    persist(); renderCategoryOptions(); render(); els.dialog.close(); showToast(index < 0 ? 'Transaction added' : 'Changes saved', 'success');
  }
  function deleteTransaction(id) { const transaction = transactions.find((t) => t.id === id); if (!transaction) return; transactions = transactions.filter((t) => t.id !== id); persist(); renderCategoryOptions(); render(); showToast('Transaction removed', 'success'); }
  function openBudgetDialog() { $('#budget-month-label').textContent = monthLabel(); els.budgetInput.value = budgets[selectedMonth] || ''; els.budgetDialog.showModal(); }
  function saveBudget(event) { event.preventDefault(); const value = Number(els.budgetInput.value); if (value < 0 || !Number.isFinite(value)) return; if (value === 0) delete budgets[selectedMonth]; else budgets[selectedMonth] = value; persist(); renderBudget(); els.budgetDialog.close(); showToast(value ? 'Monthly budget saved' : 'Monthly budget cleared', 'success'); }
  function clearFilters() { els.search.value = ''; els.typeFilter.value = 'all'; els.categoryFilter.value = 'all'; els.sort.value = 'date-desc'; renderTransactions(); }
  function exportCsv() {
    const rows = [['Date', 'Type', 'Description', 'Category', 'Amount', 'Note'], ...monthTransactions().sort((a, b) => a.date.localeCompare(b.date)).map((t) => [t.date, t.type, t.description, t.category, t.amount.toFixed(2), t.note])];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n'); download(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), `ledger-${selectedMonth}.csv`); showToast('CSV export is ready', 'success');
  }
  async function importCsv(event) {
    const file = event.target.files[0]; if (!file) return;
    try {
      const rows = parseCsv((await file.text()).replace(/^\uFEFF/, '')); if (rows.length < 2) throw new Error('The file has no transaction rows.');
      const headers = rows.shift().map((h) => h.trim().toLowerCase()); const column = (...names) => names.map((n) => headers.indexOf(n)).find((i) => i >= 0);
      const dateAt = column('date'); const typeAt = column('type'); const descriptionAt = column('description', 'name'); const categoryAt = column('category'); const amountAt = column('amount'); const noteAt = column('note');
      if ([dateAt, typeAt, descriptionAt, amountAt].some((i) => i === undefined)) throw new Error('Required columns: Date, Type, Description, Amount.');
      const imported = rows.filter((row) => row.some(Boolean)).map((row) => ({ date: (row[dateAt] || '').trim(), type: (row[typeAt] || '').trim().toLowerCase(), description: (row[descriptionAt] || '').trim(), category: categoryAt === undefined ? 'Other' : (row[categoryAt] || 'Other').trim(), amount: Number((row[amountAt] || '').replace(/[^\d.-]/g, '')), note: noteAt === undefined ? '' : (row[noteAt] || '').trim() })).filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.date) && ['income', 'expense'].includes(t.type) && t.description && Number.isFinite(t.amount) && t.amount > 0).map((t) => ({ ...t, id: crypto.randomUUID() }));
      if (!imported.length) throw new Error('No valid rows found. Check dates, types, descriptions, and amounts.');
      transactions.push(...imported); persist(); renderCategoryOptions(); render(); showToast(`${imported.length} transaction${imported.length === 1 ? '' : 's'} imported`, 'success');
    } catch (error) { showToast(error.message || 'Could not read this CSV file', 'error'); }
    finally { event.target.value = ''; }
  }
  function parseCsv(text) { const rows = []; let row = []; let field = ''; let quoted = false; for (let i = 0; i < text.length; i += 1) { const char = text[i]; if (quoted && char === '"' && text[i + 1] === '"') { field += '"'; i += 1; } else if (char === '"') quoted = !quoted; else if (char === ',' && !quoted) { row.push(field); field = ''; } else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[i + 1] === '\n') i += 1; row.push(field); rows.push(row); row = []; field = ''; } else field += char; } if (field || row.length) { row.push(field); rows.push(row); } return rows; }
  function csvCell(value) { const text = String(value ?? ''); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
  function download(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  function escapeAttr(value) { return escapeHtml(value); }
  function showToast(message, type = 'success') { const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; els.toast.appendChild(toast); setTimeout(() => toast.remove(), 3200); }

  initialize();
})();
