// === DOM Elements ===
const balanceEl = document.getElementById('balance');
const form = document.getElementById('transaction-form');
const typeInput = document.getElementById('type');
const descInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const list = document.getElementById('transaction-list');
const themeToggle = document.getElementById('theme-toggle');
const toastContainer = document.getElementById('toast-container');

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let chart;

// === Init ===
window.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    renderTransactions();
    updateBalance();
    renderChart();
});

// === Add Transaction ===
form.addEventListener('submit', function (e) {
    e.preventDefault();

    const transaction = {
        id: Date.now(),
        type: typeInput.value,
        description: descInput.value.trim(),
        amount: parseFloat(amountInput.value),
        date: dateInput.value,
    };

    if (!transaction.description || !transaction.amount || !transaction.date) {
        showToast('Please fill all fields', 'error');
        return;
    }

    transactions.push(transaction);
    saveAndRender();
    form.reset();
    showToast('Transaction added', 'success');
});

// === Save and Render ===
function saveAndRender() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    renderTransactions();
    updateBalance();
    renderChart();
}

// === Render Transactions ===
function renderTransactions(filtered = null) {
    list.innerHTML = '';
    const txns = filtered || transactions;

    txns.forEach(t => {
        const li = document.createElement('li');
        li.classList.add(t.type);
        li.innerHTML = `
      <span>${t.description} (${t.date})</span>
      <span>
        ${t.type === 'income' ? '+' : '-'}Rs. ${t.amount.toFixed(2)}
        <button class="delete-btn" onclick="deleteTransaction(${t.id})">X</button>
      </span>
    `;
        list.appendChild(li);
    });
}

// === Delete Transaction ===
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveAndRender();
    showToast('Transaction removed', 'success');
}

// === Filter Transactions ===
function filterTransactions(type) {
    if (type === 'all') {
        renderTransactions();
    } else {
        const filtered = transactions.filter(t => t.type === type);
        renderTransactions(filtered);
    }
}

// === Update Balance ===
function updateBalance() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const balance = income - expense;
    balanceEl.innerText = `Rs. ${balance.toFixed(2)}`;
}

// === Render Chart ===
function renderChart() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const options = {
        chart: {
            type: 'donut',
            height: 300,
        },
        series: [income, expense],
        labels: ['Income', 'Expense'],
        colors: ['#10b981', '#ef4444'],
    };

    if (chart) {
        chart.updateOptions(options);
    } else {
        chart = new ApexCharts(document.querySelector("#expense-chart"), options);
        chart.render();
    }
}

// === Toast Notifications ===
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// === Theme Toggle ===
themeToggle.addEventListener('change', () => {
    const mode = themeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
});

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'dark';
}
