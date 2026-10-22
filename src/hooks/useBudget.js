// Owns the budget data and the connection to the Google Sheet.
// Changes show up on screen immediately ("optimistic" updates), then get sent to the sheet.
// The sheet's reply is the real data, so once all pending saves finish we show exactly that.
import { useCallback, useEffect, useRef, useState } from 'react'
import { callApi, loadConnection, saveConnection, clearConnection } from '../lib/api.js'

const REFRESH_AFTER_MS = 30_000 // re-check the sheet when you return to the app after this long

export function useBudget() {
  const [connection, setConnection] = useState(loadConnection)
  const [data, setData] = useState(null)
  const [status, setStatus] = useState(connection ? 'loading' : 'disconnected') // disconnected | loading | ready
  const [saveState, setSaveState] = useState('saved') // saved | saving | error
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [error, setError] = useState('')

  const connRef = useRef(connection)
  const pendingRef = useRef(0) // how many saves are in flight
  const queueRef = useRef(Promise.resolve()) // saves go one at a time, in order
  const lastSyncRef = useRef(0)

  const applyServer = useCallback((serverData) => {
    lastSyncRef.current = Date.now()
    setLastSyncedAt(new Date())
    // Only replace what's on screen when nothing else is waiting to save;
    // otherwise a later optimistic change would briefly disappear.
    if (pendingRef.current === 0) setData(serverData)
  }, [])

  const refresh = useCallback(async () => {
    const conn = connRef.current
    if (!conn || pendingRef.current > 0) return
    try {
      applyServer(await callApi(conn, 'load'))
      setStatus('ready')
    } catch (e) {
      setError(e.message)
    }
  }, [applyServer])

  // First load
  useEffect(() => {
    if (connection) refresh().finally(() => setStatus((s) => (s === 'loading' ? 'ready' : s)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pick up changes made on another device or directly in the sheet
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastSyncRef.current > REFRESH_AFTER_MS) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refresh])

  /** Try a URL + key; keep them only if the sheet answers. */
  const connect = useCallback(async (url, key) => {
    const conn = { url: url.trim(), key: key.trim() }
    const serverData = await callApi(conn, 'load') // throws with a readable message
    saveConnection(conn)
    connRef.current = conn
    setConnection(conn)
    setData(serverData)
    setStatus('ready')
    setError('')
    lastSyncRef.current = Date.now()
    setLastSyncedAt(new Date())
  }, [])

  const disconnect = useCallback(() => {
    clearConnection()
    connRef.current = null
    setConnection(null)
    setData(null)
    setStatus('disconnected')
  }, [])

  /**
   * Show `localChange` right away, then run `action` on the sheet.
   * localChange: (data) => newData        action: [name, payload] for the API
   */
  const mutate = useCallback(
    (localChange, action, payload) => {
      setData((d) => localChange(d))
      pendingRef.current += 1
      setSaveState('saving')
      queueRef.current = queueRef.current.then(async () => {
        try {
          const serverData = await callApi(connRef.current, action, payload)
          pendingRef.current -= 1
          applyServer(serverData)
          if (pendingRef.current === 0) setSaveState('saved')
        } catch (e) {
          pendingRef.current -= 1
          setSaveState('error')
          setError(`Not saved: ${e.message}`)
          // Put the screen back in line with what's really in the sheet.
          if (pendingRef.current === 0) refresh()
        }
      })
    },
    [applyServer, refresh],
  )

  const addTransaction = (tx) =>
    mutate((d) => ({ ...d, transactions: [...d.transactions, tx] }), 'add', { tx })

  const updateTransaction = (tx) =>
    mutate((d) => ({ ...d, transactions: d.transactions.map((t) => (t.id === tx.id ? tx : t)) }), 'update', { tx })

  const deleteTransaction = (tx) =>
    mutate((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== tx.id) }), 'delete', { id: tx.id })

  const setGoal = (row, current) =>
    mutate((d) => ({ ...d, goals: d.goals.map((g) => (g.row === row ? { ...g, current } : g)) }), 'setGoal', {
      row,
      current,
    })

  return {
    connection,
    data,
    status,
    saveState,
    lastSyncedAt,
    error,
    clearError: () => setError(''),
    connect,
    disconnect,
    refresh,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setGoal,
  }
}
