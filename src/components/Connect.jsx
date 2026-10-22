// First screen on a new device: paste the Apps Script web app URL and app key.
import { useState } from 'react'

export default function Connect({ onConnect }) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!/^(https:\/\/script\.google(usercontent)?\.com\/|http:\/\/localhost[:/])/.test(url.trim())) {
      return setProblem('The web app URL starts with https://script.google.com/macros/s/… and ends in /exec.')
    }
    if (!key.trim()) return setProblem('Paste the app key that setup() printed.')
    setBusy(true)
    setProblem('')
    try {
      await onConnect(url, key)
    } catch (err) {
      setProblem(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="welcome">
      <h1 className="welcome__title">Budget</h1>
      <p className="welcome__lede">
        Connect this device to your budget Google Sheet. You only do this once per phone or computer.
      </p>
      <form className="connect" onSubmit={submit}>
        <label className="field">
          <span className="field__label">Web app URL</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            inputMode="url"
          />
        </label>
        <label className="field">
          <span className="field__label">App key</span>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="From the Apps Script log"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </label>
        <div className="connect__actions">
          <button className="btn btn--primary btn--large" disabled={busy}>
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </div>
        {problem && (
          <p className="banner banner--error" role="alert">
            {problem}
          </p>
        )}
      </form>
      <p className="welcome__note">
        Both values are saved only in this browser. They're never part of the code on GitHub.
      </p>
    </main>
  )
}
