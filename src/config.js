// Settings you might want to tweak. Category names must match the Monthly Budget tab exactly.

// Bills that are paid once a month. They're left out of the "everyday spending" pace chart,
// because rent landing on the 1st would make every month look overspent by day 2.
export const FIXED_CATEGORIES = [
  'Rent',
  'Utilities',
  'Phone',
  'Auto Insurance',
  'Cruise Loan',
  'Education',
  'Credit Card Payment',
  'Savings',
]

// Offered in the "Paid with" box until you've used other accounts.
export const DEFAULT_ACCOUNTS = ['Checking', 'Credit Card', 'Cash']

// How many months the trend chart shows.
export const TREND_MONTHS = 6
