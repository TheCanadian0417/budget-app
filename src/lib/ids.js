// Transaction IDs are made in the browser so a new row can be edited or deleted right away,
// before the sheet has even answered.
export const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
