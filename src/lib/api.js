// Talks to the Apps Script web app attached to your Google Sheet.
//
// Two details that make Apps Script work from a browser:
//  - Content-Type is text/plain. A JSON content type would make the browser send a
//    "preflight" OPTIONS request first, which Apps Script doesn't answer.
//  - Apps Script replies with a redirect to googleusercontent.com; fetch follows it for us.

const STORAGE_KEY = 'budget-connection'

/** The web app URL + key live only in this browser (never in the code on GitHub). */
export function loadConnection() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return saved?.url && saved?.key ? saved : null
  } catch {
    return null
  }
}

export function saveConnection(conn) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conn))
  } catch {
    /* private browsing can block storage; the app still works until the tab closes */
  }
}

export function clearConnection() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export async function callApi(conn, action, payload = {}) {
  let res
  try {
    res = await fetch(conn.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ key: conn.key, action, ...payload }),
      redirect: 'follow',
    })
  } catch {
    throw new Error("Couldn't reach Google. Check your connection and try again.")
  }
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    // An HTML page here usually means the deployment isn't set to "Anyone" or the URL is wrong.
    throw new Error(
      'Google returned a web page instead of budget data. Check the web app URL, and that the deployment\'s "Who has access" is set to Anyone.',
    )
  }
  if (!body.ok) throw new Error(body.error || 'Something went wrong in the Apps Script.')
  return body.data
}
