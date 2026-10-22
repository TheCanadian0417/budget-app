# Budget

A React app for entering purchases from your phone or computer and seeing where the month stands. Your **Google Sheet is the record**: every transaction you add, edit or delete goes straight into its Transactions tab, and the sheet's Monthly Budget tab keeps calculating like before.

```
Phone / computer  ──►  Budget app (GitHub Pages)  ──►  Apps Script web app  ──►  Google Sheet
```

## Setup (about 15 minutes, once)

### 1. Put the spreadsheet in Google Sheets

1. Upload **Hunter_Personal_Budget_Sheets.xlsx** to Google Drive.
2. Open it, then **File → Save as Google Sheets**. Work in the new Google Sheets copy from now on.

(Column G on the Transactions tab is hidden. The app keeps an ID for each row there so it can edit and delete the right one. Leave it alone.)

### 2. Add the Apps Script

1. In the Google Sheet: **Extensions → Apps Script**.
2. Delete what's in `Code.gs`, paste in the contents of **`apps-script/Code.gs`** from this project, and save.
3. In the function dropdown at the top, choose **setup** and click **Run**. Google will ask for permission:
   - Choose your account → **Advanced** → **Go to (project name) (unsafe)** → **Allow**. ("Unsafe" just means Google hasn't reviewed a script you wrote yourself.)
4. Open **View → Logs** (or the Execution log panel). Copy the **app key** it printed.

### 3. Deploy it as a web app

1. **Deploy → New deployment** → gear icon → **Web app**.
2. **Execute as:** Me. **Who has access:** Anyone.
3. Click **Deploy** and copy the **Web app URL** (ends in `/exec`).

"Anyone" is needed so the app can reach it without a Google sign-in. Every request still has to carry your app key, and without it the script answers "Wrong app key."

> **Changing Code.gs later?** Use **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. That keeps the same URL. A *new* deployment gets a new URL, and you'd have to reconnect every device.

### 4. Put the app on GitHub Pages

1. Create a new **public** repository on GitHub (e.g. `budget`). The code has no secrets in it.
2. Push this project to it:
   ```bash
   git init
   git add .
   git commit -m "Budget app"
   git branch -M main
   git remote add origin https://github.com/<your-username>/budget.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The **Actions** tab shows the deploy running. When it's green, the app is at
   `https://<your-username>.github.io/budget/`.

Every push to `main` redeploys automatically.

### 5. Connect each device

Open the site, paste the **Web app URL** and **app key**, and tap **Connect**. They're saved in that browser only.

**On iPhone:** in Safari, tap **Share → Add to Home Screen**. It opens full-screen with its own icon, like a regular app.

## Running it locally

```bash
npm install
npm run dev
```

## Day to day

- **Entering:** amount → what for → tap a category → **Add transaction**. Descriptions you've used before fill in their category and account. The date and account stay set between entries.
- **Status** (top left): *Saving…* while a change is on its way, *Synced* when the sheet has it. Changes made on another device or in the sheet itself appear when you come back to the app, or tap **Refresh**.
- **Budget amounts, categories, take-home pay** are still edited in the sheet. The app picks them up on the next refresh.
- **Viewing another month in the sheet:** Monthly Budget cell **B2** (yellow). Type the 1st of any month.

## Where things are (for learning)

| File | What it does |
|---|---|
| `apps-script/Code.gs` | The API: checks the key, reads the tabs, adds/edits/deletes rows, keeps the ledger sorted by date |
| `src/lib/api.js` | `fetch` calls to the script, plus the two tricks Apps Script needs (text/plain body, follow the redirect) |
| `src/hooks/useBudget.js` | Custom hook: holds the data, shows changes instantly, sends them one at a time, swaps in the sheet's answer |
| `src/App.jsx` | Page layout, month navigation, add/edit/delete actions |
| `src/lib/derive.js` | Pure functions that turn transactions into totals and chart data |
| `src/components/TransactionForm.jsx` | The quick-add bar and the edit dialog (one component, two `variant`s) |
| `src/components/Envelopes.jsx` | Spent-of-budget bar per category |
| `src/components/Charts.jsx` | Everyday-pace line chart + month-by-month bars ([Recharts](https://recharts.org)) |
| `src/components/TransactionList.jsx` | Latest list and the full searchable table |
| `src/components/Goals.jsx` | Goals tab, with editable "current" amounts |
| `src/components/Connect.jsx` | First-run screen for the URL + key |
| `src/App.css` | All styling, in numbered sections. Colors are CSS variables; dark mode is the second block |
| `src/config.js` | Which categories count as fixed bills, default accounts, trend length |
| `.github/workflows/deploy.yml` | Builds and publishes to GitHub Pages on every push |

### Things worth noticing

- **Optimistic updates:** `useBudget` changes the screen first and talks to Google second, so entering a purchase feels instant even on a slow connection. If the save fails, it reloads from the sheet so the screen never lies.
- **IDs are made in the browser** (`crypto.randomUUID()`), so you can edit a row you just added before Google has even answered.
- **The save queue** (`queueRef`) chains promises so rapid entries reach the sheet in order.
- **`base: './'` in `vite.config.js`** makes asset paths relative, which is why the same build works at any GitHub Pages repo name.
- In `App.css` section 14, phone layouts use `grid-column: 1 / -1` to let some fields span the full row, and inputs use 16px text so iPhone doesn't zoom in on tap.

## Troubleshooting

| Message | Fix |
|---|---|
| Wrong app key | Re-copy the key from the Apps Script log (run `setup` again to print it; it keeps the same key). |
| Google returned a web page instead of budget data | The URL is wrong, or the deployment isn't set to **Who has access: Anyone**. |
| Run setup() in the Apps Script editor first | Do step 2.3. |
| That transaction was changed or deleted somewhere else | It was edited in the sheet or on another device. The app refreshes itself. |
