import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return undefined
    }

    let isMounted = true

    async function loadSession() {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!isMounted) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      setLoading(false)
    }

    loadSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return undefined
    }

    let isMounted = true

    async function loadProfile() {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!isMounted) return
      if (profileError) {
        setError(profileError.message)
        setProfile(null)
        return
      }
      setProfile(data)
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [session])

  const value = useMemo(
    () => ({
      approved: Boolean(profile?.is_approved),
      configured: isSupabaseConfigured,
      error,
      loading,
      profile,
      session,
      supabase,
      user: session?.user || null,
    }),
    [error, loading, profile, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export function useSupabaseList(tableName, fallbackRows, fromRow, toRow, options = {}) {
  const { approved, configured, user } = useAuth()
  const [rows, setRows] = useState(fallbackRows)
  const [loading, setLoading] = useState(Boolean(configured && approved))
  const [error, setError] = useState('')

  async function loadRows() {
    if (!configured || !approved) {
      setRows(fallbackRows)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    let query = supabase.from(tableName).select('*')
    if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? false })
    const { data, error: loadError } = await query

    if (loadError) {
      setError(loadError.message)
      setRows(fallbackRows)
    } else {
      setRows((data || []).map(fromRow))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRows()
  }, [approved, configured, tableName])

  async function saveRows(nextRows) {
    if (!configured || !approved) return

    const { error: deleteError } = await supabase.from(tableName).delete().not('id', 'is', null)
    if (deleteError) {
      setError(deleteError.message)
      return
    }

    if (!nextRows.length) return

    const payload = nextRows.map((row) => {
      const converted = toRow(row)
      return {
        ...converted,
        author_id: converted.author_id || user?.id || null,
        updated_at: new Date().toISOString(),
      }
    })

    const { error: upsertError } = await supabase.from(tableName).upsert(payload, { onConflict: 'id' })
    if (upsertError) setError(upsertError.message)
  }

  function setAndSave(updater) {
    setRows((current) => {
      const nextRows = typeof updater === 'function' ? updater(current) : updater
      saveRows(nextRows)
      return nextRows
    })
  }

  async function importFromLocalStorage(storageKey) {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return
    const parsed = JSON.parse(stored)
    setRows(parsed)
    await saveRows(parsed)
  }

  return [rows, setAndSave, { error, importFromLocalStorage, loading, refresh: loadRows }]
}

export function useSupabaseTrips(fallbackTrips) {
  return useSupabaseList(
    'countdown_events',
    fallbackTrips,
    (row) => ({
      id: row.id,
      name: row.name,
      date: row.event_date,
      message: row.message || '',
    }),
    (trip) => ({
      id: trip.id,
      event_type: 'next-trip',
      name: trip.name,
      event_date: trip.date,
      message: trip.message || '',
    }),
    { orderBy: 'event_date', ascending: true },
  )
}

export function useDateNightState(fallbackState) {
  const { approved, configured, user } = useAuth()
  const [state, setState] = useState(fallbackState)
  const [loading, setLoading] = useState(Boolean(configured && approved))
  const [error, setError] = useState('')

  async function loadState() {
    if (!configured || !approved) {
      setState(fallbackState)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error: loadError } = await supabase.from('favorite_date_ideas').select('*')
    if (loadError) {
      setError(loadError.message)
      setState(fallbackState)
    } else {
      setState({
        favorites: (data || []).filter((row) => row.is_favorite).map((row) => row.idea_id),
        completed: (data || []).filter((row) => row.is_completed).map((row) => row.idea_id),
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadState()
  }, [approved, configured])

  async function saveState(nextState) {
    if (!configured || !approved) return

    const { error: deleteError } = await supabase.from('favorite_date_ideas').delete().not('idea_id', 'is', null)
    if (deleteError) {
      setError(deleteError.message)
      return
    }

    const ideaIds = [...new Set([...(nextState.favorites || []), ...(nextState.completed || [])])]
    const payload = ideaIds
      .map((ideaId) => ({
        idea_id: ideaId,
        is_favorite: (nextState.favorites || []).includes(ideaId),
        is_completed: (nextState.completed || []).includes(ideaId),
        author_id: user?.id || null,
        updated_at: new Date().toISOString(),
      }))

    if (!payload.length) return
    const { error: upsertError } = await supabase.from('favorite_date_ideas').upsert(payload, { onConflict: 'idea_id' })
    if (upsertError) setError(upsertError.message)
  }

  function setAndSave(updater) {
    setState((current) => {
      const nextState = typeof updater === 'function' ? updater(current) : updater
      saveState(nextState)
      return nextState
    })
  }

  async function importFromLocalStorage(storageKey) {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return
    const parsed = JSON.parse(stored)
    setState(parsed)
    await saveState(parsed)
  }

  return [state, setAndSave, { error, importFromLocalStorage, loading, refresh: loadState }]
}

export function useNextVisitState(fallbackVisit) {
  const { approved, configured, user } = useAuth()
  const [visit, setVisit] = useState(fallbackVisit)
  const [loading, setLoading] = useState(Boolean(configured && approved))
  const [error, setError] = useState('')

  async function loadVisit() {
    if (!configured || !approved) {
      setVisit(fallbackVisit)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    const [{ data: visits, error: visitError }, { data: itinerary, error: itineraryError }, { data: checklist, error: checklistError }] =
      await Promise.all([
        supabase.from('next_visits').select('*').order('start_date', { ascending: true }).limit(1),
        supabase.from('visit_itinerary_items').select('*').order('date', { ascending: true }).order('time', { ascending: true }),
        supabase.from('visit_checklist_items').select('*').order('created_at', { ascending: true }),
      ])

    const loadError = visitError || itineraryError || checklistError
    if (loadError) {
      setError(loadError.message)
      setVisit(fallbackVisit)
      setLoading(false)
      return
    }

    const row = visits?.[0]
    if (!row) {
      setVisit(fallbackVisit)
      setLoading(false)
      return
    }

    setVisit({
      id: row.id,
      title: row.title,
      startDate: row.start_date,
      endDate: row.end_date,
      city: row.city,
      arrivalTime: row.arrival_time || '',
      departureTime: row.departure_time || '',
      travelNotes: row.travel_notes || '',
      itinerary: (itinerary || []).map((item) => ({
        id: item.id,
        date: item.date,
        time: item.time || '',
        title: item.title,
        location: item.location || '',
        notes: item.notes || '',
        category: item.category || 'other',
      })),
      packing: (checklist || [])
        .filter((item) => item.list_type === 'packing')
        .map((item) => ({ id: item.id, label: item.label, done: item.done })),
      wishList: (checklist || [])
        .filter((item) => item.list_type === 'wish')
        .map((item) => ({ id: item.id, text: item.label, label: item.label, done: item.done })),
    })
    setLoading(false)
  }

  useEffect(() => {
    loadVisit()
  }, [approved, configured])

  async function saveVisit(nextVisit) {
    if (!configured || !approved) return

    const now = new Date().toISOString()
    const { error: visitError } = await supabase.from('next_visits').upsert(
      {
        id: nextVisit.id,
        title: nextVisit.title,
        start_date: nextVisit.startDate,
        end_date: nextVisit.endDate,
        city: nextVisit.city,
        arrival_time: nextVisit.arrivalTime || null,
        departure_time: nextVisit.departureTime || null,
        travel_notes: nextVisit.travelNotes || '',
        author_id: user?.id || null,
        updated_at: now,
      },
      { onConflict: 'id' },
    )
    if (visitError) {
      setError(visitError.message)
      return
    }

    await Promise.all([
      supabase.from('visit_itinerary_items').delete().eq('visit_id', nextVisit.id),
      supabase.from('visit_checklist_items').delete().eq('visit_id', nextVisit.id),
    ])

    const itineraryRows = (nextVisit.itinerary || []).map((item) => ({
      id: item.id,
      visit_id: nextVisit.id,
      date: item.date,
      time: item.time || null,
      title: item.title,
      location: item.location || '',
      notes: item.notes || '',
      category: item.category || 'other',
      author_id: user?.id || null,
      updated_at: now,
    }))
    const checklistRows = [
      ...(nextVisit.packing || []).map((item) => ({ ...item, list_type: 'packing', label: item.label || item.text })),
      ...(nextVisit.wishList || []).map((item) => ({ ...item, list_type: 'wish', label: item.label || item.text })),
    ].map((item) => ({
      id: item.id,
      visit_id: nextVisit.id,
      list_type: item.list_type,
      label: item.label,
      done: Boolean(item.done),
      author_id: user?.id || null,
      updated_at: now,
    }))

    if (itineraryRows.length) {
      const { error: itineraryError } = await supabase.from('visit_itinerary_items').upsert(itineraryRows, { onConflict: 'id' })
      if (itineraryError) setError(itineraryError.message)
    }
    if (checklistRows.length) {
      const { error: checklistError } = await supabase.from('visit_checklist_items').upsert(checklistRows, { onConflict: 'id' })
      if (checklistError) setError(checklistError.message)
    }
  }

  function setAndSave(updater) {
    setVisit((current) => {
      const nextVisit = typeof updater === 'function' ? updater(current) : updater
      saveVisit(nextVisit)
      return nextVisit
    })
  }

  async function importFromLocalStorage(storageKey) {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return
    const parsed = JSON.parse(stored)
    setVisit(parsed)
    await saveVisit(parsed)
  }

  return [visit, setAndSave, { error, importFromLocalStorage, loading, refresh: loadVisit }]
}
