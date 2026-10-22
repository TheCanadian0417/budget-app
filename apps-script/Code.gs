/**
 * Budget app API — paste this into Extensions > Apps Script in your budget Google Sheet.
 *
 * The React app sends POST requests here. Every request must include the secret app key,
 * which `setup()` creates and prints. Anyone without the key gets "Wrong app key".
 *
 * Actions: load, add, update, delete, setGoal. Each one returns the whole budget afterwards,
 * so the app always ends up showing exactly what's in the sheet.
 */

const SHEET = { budget: 'Monthly Budget', tx: 'Transactions', goals: 'Goals' };
// Transactions columns: A Date | B Description | C Category | D Amount | E Account | F Notes | G ID
const TX_COLS = 7;
const DATE_FMT = 'm/d/yyyy';
const MONEY_FMT = '$#,##0.00;[Red]($#,##0.00);-';

/** Run this once from the editor (select "setup" and click Run). It prints your app key. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('API_KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '');
    props.setProperty('API_KEY', key);
  }
  const tx = sheet_(SHEET.tx);
  if (!tx.getRange(1, 7).getValue()) tx.getRange(1, 7).setValue('ID');
  readTransactions_(); // gives any existing rows an ID
  Logger.log('Your app key (paste it into the app): ' + key);
}

/** Visiting the web app URL in a browser just confirms it's running. */
function doGet() {
  return json_({ ok: true, message: 'Budget API is running. Connect to it from the Budget app.' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Bad request.' });
  }
  const key = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (!key) return json_({ ok: false, error: 'Run setup() in the Apps Script editor first.' });
  if (body.key !== key) return json_({ ok: false, error: 'Wrong app key.' });

  const lock = LockService.getScriptLock(); // one change at a time (phone + computer)
  lock.waitLock(20000);
  try {
    switch (body.action) {
      case 'load':
        break;
      case 'add':
        addTx_(body.tx);
        break;
      case 'update':
        updateTx_(body.tx);
        break;
      case 'delete':
        deleteTx_(body.id);
        break;
      case 'setGoal':
        setGoal_(body.row, body.current);
        break;
      default:
        throw new Error('Unknown action: ' + body.action);
    }
    SpreadsheetApp.flush();
    return json_({ ok: true, data: readAll_() });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- reading

function readAll_() {
  return {
    categories: readCategories_(),
    takeHome: readTakeHome_(),
    transactions: readTransactions_(),
    goals: readGoals_(),
  };
}

function readCategories_() {
  const sh = sheet_(SHEET.budget);
  const last = sh.getLastRow();
  if (last < 4) return [];
  const rows = sh.getRange(4, 1, last - 3, 2).getValues();
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const name = String(rows[i][0]).trim();
    if (/^total$/i.test(name)) break;
    if (name) out.push({ name: name, budget: num_(rows[i][1]), row: i + 4 });
  }
  return out;
}

function readTakeHome_() {
  const sh = sheet_(SHEET.budget);
  const rows = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 2).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (/take-home/i.test(String(rows[i][0]))) return num_(rows[i][1]);
  }
  return 0;
}

function readTransactions_() {
  const sh = sheet_(SHEET.tx);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const range = sh.getRange(2, 1, last - 1, TX_COLS);
  const rows = range.getValues();
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const out = [];
  let idsAdded = false;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const empty = r[0] === '' && r[1] === '' && r[3] === '';
    if (empty) continue;
    if (!r[6]) {
      r[6] = Utilities.getUuid(); // rows typed straight into the sheet get an ID here
      idsAdded = true;
    }
    out.push({
      id: String(r[6]),
      date: isoDate_(r[0], tz),
      description: String(r[1]).trim(),
      category: String(r[2]).trim(),
      amount: num_(r[3]),
      account: String(r[4]).trim(),
      notes: String(r[5]).trim(),
    });
  }
  if (idsAdded) {
    sh.getRange(2, 7, rows.length, 1).setValues(rows.map(function (r) { return [r[6]]; }));
  }
  return out;
}

function readGoals_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.goals);
  if (!sh || sh.getLastRow() < 3) return [];
  const rows = sh.getRange(3, 1, sh.getLastRow() - 2, 4).getValues();
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const name = String(rows[i][0]).trim();
    if (!name) break;
    out.push({
      name: name,
      row: i + 3,
      current: num_(rows[i][1]),
      target: num_(rows[i][2]),
      monthly: String(rows[i][3]),
    });
  }
  return out;
}

// ---------------------------------------------------------------- writing

function addTx_(tx) {
  const clean = validTx_(tx);
  const sh = sheet_(SHEET.tx);
  const row = sh.getLastRow() + 1;
  writeRow_(sh, row, clean, tx.id && /^[\w-]{8,64}$/.test(tx.id) ? tx.id : Utilities.getUuid());
  sortByDate_(sh);
}

function updateTx_(tx) {
  const clean = validTx_(tx);
  const sh = sheet_(SHEET.tx);
  const row = findRow_(sh, tx.id);
  writeRow_(sh, row, clean, tx.id);
  sortByDate_(sh);
}

function deleteTx_(id) {
  const sh = sheet_(SHEET.tx);
  sh.deleteRow(findRow_(sh, id));
}

function setGoal_(row, current) {
  const sh = sheet_(SHEET.goals);
  const r = Number(row);
  if (!(r >= 3) || !String(sh.getRange(r, 1).getValue()).trim()) throw new Error('That goal no longer exists.');
  sh.getRange(r, 2).setValue(num_(current));
}

function writeRow_(sh, row, t, id) {
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const date = Utilities.parseDate(t.date, tz, 'yyyy-MM-dd');
  sh.getRange(row, 1, 1, TX_COLS).setValues([[date, t.description, t.category, t.amount, t.account, t.notes, id]]);
  sh.getRange(row, 1).setNumberFormat(DATE_FMT);
  sh.getRange(row, 4).setNumberFormat(MONEY_FMT);
}

function sortByDate_(sh) {
  const last = sh.getLastRow();
  if (last > 2) sh.getRange(2, 1, last - 1, TX_COLS).sort({ column: 1, ascending: true });
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (id && last >= 2) {
    const ids = sh.getRange(2, 7, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  }
  throw new Error('That transaction was changed or deleted somewhere else. Refreshing.');
}

function validTx_(tx) {
  if (!tx || typeof tx !== 'object') throw new Error('Missing transaction.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.date || '')) throw new Error('Invalid date.');
  const amount = Number(tx.amount);
  if (!isFinite(amount)) throw new Error('Invalid amount.');
  const s = function (v, max) { return String(v == null ? '' : v).trim().slice(0, max); };
  return {
    date: tx.date,
    description: s(tx.description, 200),
    category: s(tx.category, 100),
    amount: Math.round(amount * 100) / 100,
    account: s(tx.account, 100),
    notes: s(tx.notes, 500),
  };
}

// ---------------------------------------------------------------- helpers

function sheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('This spreadsheet has no "' + name + '" tab.');
  return sh;
}

function num_(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[$,]/g, ''));
  return isFinite(n) ? n : 0;
}

function isoDate_(v, tz) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return y + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
