# Ledger — Personal Expense Tracker

Ledger is a private, responsive personal finance dashboard built with plain HTML, CSS, and JavaScript. It runs in your browser and stores transactions, preferences, and monthly budgets locally on your device.

## Features

- Track income and expenses with dates, categories, and optional notes.
- Edit or remove transactions at any time.
- Review total balance, monthly income and spending, and savings rate.
- Explore spending by category with a visual breakdown.
- Set a monthly spending limit and track progress as you go.
- Search transactions and filter by type or category.
- Sort by date or amount and navigate between months.
- Choose LKR, USD, EUR, GBP, INR, AUD, or CAD for display.
- Import and export transactions as CSV.
- Switch between light and dark appearance.
- Automatically adapts to desktop, tablet, and mobile screens.

## Getting started

No build step or package installation is needed. Clone the repository and open `index.html` in a modern browser, or serve the folder with any static web server.

```bash
git clone https://github.com/Aqueel-i/Expense-Tracker.git
cd Expense-Tracker
```

## CSV format

CSV imports require `Date`, `Type`, `Description`, and `Amount` columns. `Category` and `Note` are optional. Dates use `YYYY-MM-DD`, and type values are `income` or `expense`. Exports are compatible with the same import format.

## Privacy

Ledger has no account or backend. Your information stays in your browser's local storage. Clearing site data in your browser will remove it, so export a CSV backup if you need one.

## Tech

- HTML5, CSS3, and vanilla JavaScript
- Browser local storage
- CSS conic gradients for the category chart

Made for mindful money moments.
