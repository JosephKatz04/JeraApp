import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  CalendarHeart,
  Camera,
  CheckCircle2,
  Clock3,
  Cloud,
  CloudRain,
  CloudSun,
  Feather,
  Edit3,
  Heart,
  Home,
  ImagePlus,
  LockKeyhole,
  MapPinned,
  Menu,
  MessageCircleHeart,
  Plane,
  Plus,
  Save,
  Snowflake,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { albumPhotos, bucketList, countdownEvents, couple, dailyThreeEntries, dateNightIdeas, importantDates, memories, memoryMapPins, nextVisitPlan, notes } from './data'
import { supabase } from './supabaseClient'
import { useAuth, useDateNightState, useNextVisitState, useSupabaseList, useSupabaseTrips } from './supabaseHooks.jsx'
import heroBackground from '../assets/background.JPG'

const MEMORY_STORAGE_KEY = 'our-little-map.memories'
const NOTE_STORAGE_KEY = 'our-little-map.notes'
const TRIP_STORAGE_KEY = 'our-little-map.trips'
const ALBUM_STORAGE_KEY = 'our-little-map.album'
const DATE_NIGHT_STORAGE_KEY = 'our-little-map.dateNight'
const MAP_STORAGE_KEY = 'our-little-map.mapPins'
const BUCKET_STORAGE_KEY = 'our-little-map.bucketList'
const NEXT_VISIT_STORAGE_KEY = 'our-little-map.nextVisit'
const DAILY_THREE_STORAGE_KEY = 'our-little-map.dailyThree'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const memoryCategories = ['firsts', 'trips', 'calls', 'gifts', 'funny moments', 'milestones']

const emptyMemoryForm = {
  title: '',
  date: '',
  location: '',
  category: 'milestones',
  description: '',
  photo: '',
}

const noteMoods = ['soft', 'grateful', 'missing you', 'proud', 'silly', 'quiet', 'excited']

const emptyNoteForm = {
  message: '',
  author: couple.personOne,
  mood: 'soft',
}

const albumCategories = ['trips', 'dates', 'calls', 'gifts', 'little moments', 'milestones']
const dateNightCategories = [
  'cozy night in',
  'long-distance date',
  'going out',
  'food',
  'movies',
  'deep questions',
  'silly/fun',
  'future planning',
]
const mapMemoryTypes = ['dates', 'trips', 'calls', 'gifts', 'milestones', 'future planning', 'little moments']
const bucketCategories = ['travel', 'food', 'experiences', 'cozy', 'future', 'random', 'gifts', 'traditions']
const bucketStatuses = ['want to do', 'planned', 'completed']

const emptyMapPinForm = {
  placeName: '',
  locationQuery: '',
  date: '',
  description: '',
  photo: '',
  memoryType: 'dates',
}

const emptyBucketForm = {
  title: '',
  status: 'want to do',
  notes: '',
  targetDate: '',
  category: 'experiences',
  memoryPhoto: '',
  memoryCaption: '',
}

const emptyPhotoForm = {
  caption: '',
  date: '',
  category: 'little moments',
  image: '',
}

const visitCategories = ['food', 'activity', 'cozy', 'travel', 'family', 'surprise', 'other']

const emptyItineraryForm = {
  date: '',
  time: '',
  title: '',
  location: '',
  notes: '',
  category: 'activity',
}

const emptyQuickListForm = {
  label: '',
}

const emptyDailyThreeForm = {
  date: '',
  author: couple.personOne,
  itemOne: '',
  itemTwo: '',
  itemThree: '',
  note: '',
}

const weatherCities = [
  {
    id: 'toronto',
    name: 'Toronto',
    label: 'Toronto',
    latitude: 43.6532,
    longitude: -79.3832,
  },
  {
    id: 'calgary',
    name: 'Calgary',
    label: 'Calgary',
    latitude: 51.0447,
    longitude: -114.0719,
  },
]

const mockWeather = [
  {
    id: 'toronto',
    city: 'Toronto',
    temperature: 22,
    condition: 'Partly cloudy',
    high: 25,
    low: 17,
    feelsLike: 23,
    code: 2,
    source: 'sample',
  },
  {
    id: 'calgary',
    city: 'Calgary',
    temperature: 18,
    condition: 'Clear',
    high: 21,
    low: 10,
    feelsLike: 17,
    code: 0,
    source: 'sample',
  },
]

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/timeline', label: 'Timeline', icon: CalendarHeart },
  { to: '/notes', label: 'Notes', icon: MessageCircleHeart },
  { to: '/countdowns', label: 'Dates', icon: Clock3 },
  { to: '/next-visit', label: 'Next Visit', icon: Plane },
  { to: '/weather', label: 'Weather', icon: CloudSun },
  { to: '/daily-3', label: 'Daily 3', icon: Feather },
  { to: '/album', label: 'Album', icon: Camera },
  { to: '/date-night', label: 'Date', icon: Sparkles },
  { to: '/map', label: 'Map', icon: MapPinned },
  { to: '/bucket-list', label: 'List', icon: CheckCircle2 },
]

function formatDate(dateString) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateString}T00:00:00`))
}

function formatDateTime(dateTimeString) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateTimeString))
}

function getNextEventDate(event, now = new Date()) {
  const baseDate = new Date(`${event.date}T00:00:00`)

  if (event.repeats !== 'yearly') {
    return baseDate
  }

  const nextDate = new Date(now.getFullYear(), baseDate.getMonth(), baseDate.getDate())
  if (nextDate.getTime() < now.getTime()) {
    nextDate.setFullYear(nextDate.getFullYear() + 1)
  }

  return nextDate
}

function getCountdownEventItems(events) {
  return events.flatMap((event) => {
    if (event.category !== 'next-trip') {
      return [event]
    }

    return event.trips.map((trip) => ({
      ...trip,
      category: 'next-trip',
      groupName: event.name,
      repeats: 'once',
      message: trip.message || event.message,
    }))
  })
}

function getAnniversaryEvent(events) {
  return events.find((event) => event.id === 'anniversary')
}

function getConfiguredTrips(events) {
  return events.find((event) => event.category === 'next-trip')?.trips || []
}

function getTimeRemaining(targetDate, now = new Date()) {
  const total = Math.max(0, targetDate.getTime() - now.getTime())

  return {
    total,
    days: Math.floor(total / 86400000),
    hours: Math.floor((total / 3600000) % 24),
    minutes: Math.floor((total / 60000) % 60),
    seconds: Math.floor((total / 1000) % 60),
  }
}

function formatCountdownDate(date) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const rowMappers = {
  memory: {
    from: (row) => ({
      id: row.id,
      title: row.title,
      date: row.memory_date,
      location: row.location || '',
      category: row.category || 'milestones',
      description: row.description || '',
      photo: row.photo_url || '',
    }),
    to: (memory) => ({
      id: memory.id,
      title: memory.title,
      memory_date: memory.date,
      location: memory.location || '',
      category: memory.category,
      description: memory.description || '',
      photo_url: memory.photo || '',
    }),
  },
  note: {
    from: (row) => ({
      id: row.id,
      message: row.message,
      author: row.display_author || row.author_name || '',
      dateTime: row.note_time,
      mood: row.mood || 'soft',
    }),
    to: (note) => ({
      id: note.id,
      message: note.message,
      display_author: note.author,
      author_name: note.author,
      note_time: note.dateTime,
      mood: note.mood || 'soft',
    }),
  },
  photo: {
    from: (row) => ({
      id: row.id,
      image: row.image_url,
      caption: row.caption,
      date: row.photo_date,
      category: row.category || 'little moments',
    }),
    to: (photo) => ({
      id: photo.id,
      image_url: photo.image,
      caption: photo.caption,
      photo_date: photo.date,
      category: photo.category,
    }),
  },
  mapPin: {
    from: (row) => ({
      id: row.id,
      placeName: row.place_name,
      coordinates: [row.latitude, row.longitude],
      date: row.memory_date,
      description: row.description || '',
      photo: row.photo_url || '',
      memoryType: row.memory_type || 'dates',
    }),
    to: (pin) => ({
      id: pin.id,
      place_name: pin.placeName,
      latitude: pin.coordinates?.[0],
      longitude: pin.coordinates?.[1],
      memory_date: pin.date,
      description: pin.description || '',
      photo_url: pin.photo || '',
      memory_type: pin.memoryType || 'dates',
    }),
  },
  bucket: {
    from: (row) => ({
      id: row.id,
      title: row.title,
      category: row.category || 'experiences',
      status: row.status || 'want to do',
      notes: row.notes || '',
      targetDate: row.target_date || '',
      memoryPhoto: row.memory_photo_url || '',
      memoryCaption: row.memory_caption || '',
    }),
    to: (item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      status: item.status,
      notes: item.notes || '',
      target_date: item.targetDate || null,
      memory_photo_url: item.memoryPhoto || '',
      memory_caption: item.memoryCaption || '',
    }),
  },
  dailyThree: {
    from: (row) => ({
      id: row.id,
      date: row.entry_date,
      author: row.display_author || row.author_name || '',
      items: [row.item_1, row.item_2, row.item_3],
      note: row.note || '',
    }),
    to: (entry) => ({
      id: entry.id,
      entry_date: entry.date,
      display_author: entry.author,
      author_name: entry.author,
      item_1: entry.items[0],
      item_2: entry.items[1],
      item_3: entry.items[2],
      note: entry.note || '',
    }),
  },
}

function getWeatherCodeInfo(code) {
  if (code === 0) return { label: 'Clear', type: 'clear' }
  if ([1, 2].includes(code)) return { label: 'Partly cloudy', type: 'partly-cloudy' }
  if (code === 3) return { label: 'Cloudy', type: 'cloudy' }
  if ([45, 48].includes(code)) return { label: 'Foggy', type: 'cloudy' }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Rainy', type: 'rain' }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { label: 'Snowy', type: 'snow' }
  if (code >= 95) return { label: 'Stormy', type: 'rain' }
  return { label: 'Weather nearby', type: 'partly-cloudy' }
}

function buildWeatherUrl(city) {
  const params = new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    current: 'temperature_2m,apparent_temperature,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min',
    forecast_days: '1',
    timezone: 'auto',
  })

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`
}

function normalizeWeather(city, payload) {
  const code = payload.current?.weather_code ?? 2
  const codeInfo = getWeatherCodeInfo(code)

  return {
    id: city.id,
    city: city.name,
    temperature: payload.current?.temperature_2m,
    condition: codeInfo.label,
    high: payload.daily?.temperature_2m_max?.[0],
    low: payload.daily?.temperature_2m_min?.[0],
    feelsLike: payload.current?.apparent_temperature,
    code,
    source: 'live',
  }
}

function formatTemperature(value) {
  if (typeof value !== 'number') return '--'
  return `${Math.round(value)}\u00b0`
}

function getWeatherComparison(weather) {
  if (weather.length < 2) return 'Same sky, two cities.'

  const [toronto, calgary] = weather
  const torontoInfo = getWeatherCodeInfo(toronto.code)
  const calgaryInfo = getWeatherCodeInfo(calgary.code)
  const tempDifference = Math.round(Math.abs((toronto.temperature ?? 0) - (calgary.temperature ?? 0)))
  const warmerCity = (toronto.temperature ?? 0) > (calgary.temperature ?? 0) ? toronto.city : calgary.city

  if (torontoInfo.type === 'rain' && calgaryInfo.type === 'clear') return 'Toronto is rainy, Calgary is clear.'
  if (calgaryInfo.type === 'rain' && torontoInfo.type === 'clear') return 'Calgary is rainy, Toronto is clear.'
  if (tempDifference >= 3) return `Warmer in ${warmerCity} today by about ${tempDifference}\u00b0C.`
  if (torontoInfo.type !== calgaryInfo.type) return `${toronto.city} is ${toronto.condition.toLowerCase()}, ${calgary.city} is ${calgary.condition.toLowerCase()}.`
  return 'Different weather, same us.'
}

function App() {
  const auth = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('menu-open', isMobileMenuOpen)
    return () => document.body.classList.remove('menu-open')
  }, [isMobileMenuOpen])

  if (!auth.configured) {
    return <AuthShell title="Supabase setup needed" message="Add your Supabase URL and anon key to the environment before opening the private app." />
  }

  if (auth.loading) {
    return <AuthShell title="Opening Jera App" message="Checking your private session..." />
  }

  if (!auth.session) {
    return <AuthPage />
  }

  if (!auth.approved) {
    return (
      <AuthShell
        title="Waiting for approval"
        message="This account is signed in, but it is not one of the two approved users yet. Approve it in the profiles table, then refresh."
        actionLabel="Sign out"
        onAction={() => supabase.auth.signOut()}
      />
    )
  }

  return (
    <div className="app-shell">
      <BackgroundAccents />
      <aside className="desktop-nav" aria-label="Primary navigation">
        <Brand />
        <button className="sign-out-button" type="button" onClick={() => supabase.auth.signOut()}>
          <LockKeyhole size={16} />
          <span>Sign out</span>
        </button>
        <nav>
          {navItems.map((item) => (
            <NavigationLink key={item.to} item={item} />
          ))}
        </nav>
      </aside>

      <div className="app-frame">
        <header className="mobile-header">
          <Brand compact />
          <button
            className="mobile-menu-button"
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu size={22} />
          </button>
        </header>

        <header className="topbar">
          <Brand compact />
          <nav className="top-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavigationLink key={item.to} item={item} />
            ))}
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/countdowns" element={<CountdownsPage />} />
            <Route path="/next-visit" element={<NextVisitPage />} />
            <Route path="/weather" element={<TwoCityWeatherPage />} />
            <Route path="/daily-3" element={<DailyThreePage />} />
            <Route path="/album" element={<AlbumPage />} />
            <Route path="/date-night" element={<DateNightPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/bucket-list" element={<BucketListPage />} />
          </Routes>
        </main>
      </div>

      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="mobile-menu-top">
            <Brand />
            <button
              className="mobile-menu-button"
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close navigation menu"
            >
              <X size={22} />
            </button>
          </div>

          <nav className="mobile-menu-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavigationLink key={item.to} item={item} mobile onNavigate={() => setIsMobileMenuOpen(false)} />
            ))}
            <button className="sign-out-button" type="button" onClick={() => supabase.auth.signOut()}>
              <LockKeyhole size={17} />
              <span>Sign out</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}

function AuthShell({ title, message, actionLabel, onAction }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Brand />
        <div>
          <p className="eyebrow">Private access</p>
          <h1>{title}</h1>
          <p>{message}</p>
        </div>
        {actionLabel && (
          <button className="primary-action" type="button" onClick={onAction}>
            <LockKeyhole size={18} />
            <span>{actionLabel}</span>
          </button>
        )}
      </section>
    </main>
  )
}

function AuthPage() {
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setStatus('')

    const authCall = mode === 'sign-in'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })

    const { error: authError } = await authCall
    if (authError) {
      setError(authError.message)
    } else if (mode === 'sign-up') {
      setStatus('Account created. If email confirmation is enabled, check your inbox. Then approve this email in Supabase.')
    }

    setSubmitting(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Brand />
        <div>
          <p className="eyebrow">Jera App</p>
          <h1>{mode === 'sign-in' ? 'Sign in together' : 'Create private access'}</h1>
          <p>Only the two approved accounts can open this private Toronto-Calgary space.</p>
        </div>

        <form className="memory-form auth-form" onSubmit={handleAuthSubmit}>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="6" required />
          </label>
          {error && <p className="form-error">{error}</p>}
          {status && <p className="form-success">{status}</p>}
          <button className="primary-action" type="submit" disabled={submitting}>
            <LockKeyhole size={18} />
            <span>{submitting ? 'Checking...' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}</span>
          </button>
        </form>

        <button className="auth-switch-button" type="button" onClick={() => setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))}>
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already approved? Sign in'}
        </button>
      </section>
    </main>
  )
}

function BackgroundAccents() {
  return (
    <div className="background-accents" aria-hidden="true">
      <div className="skyline skyline-left" />
      <div className="skyline skyline-right" />
      <svg className="flight-path" viewBox="0 0 900 420" role="img">
        <path d="M96 270C256 128 406 352 555 210C646 124 745 136 823 72" />
        <circle cx="96" cy="270" r="6" />
        <circle cx="823" cy="72" r="6" />
      </svg>
    </div>
  )
}

function Brand({ compact = false }) {
  return (
    <div className={compact ? 'brand brand-compact' : 'brand'}>
      <span className="brand-mark">
        <Plane size={18} />
      </span>
      <div>
        <strong>Jera App</strong>
        {!compact && <span>{couple.homeBaseOne} to {couple.homeBaseTwo}</span>}
      </div>
    </div>
  )
}

function NavigationLink({ item, mobile = false, onNavigate }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
      end={item.to === '/'}
      onClick={onNavigate}
    >
      <Icon size={mobile ? 19 : 18} aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  )
}

function HomeDashboard() {
  const [dashboardMemories] = useSupabaseList('memories', memories, rowMappers.memory.from, rowMappers.memory.to, { orderBy: 'memory_date' })
  const [dashboardNotes] = useSupabaseList('love_notes', notes, rowMappers.note.from, rowMappers.note.to, { orderBy: 'note_time' })
  const [dashboardBucket] = useSupabaseList('bucket_list_items', bucketList, rowMappers.bucket.from, rowMappers.bucket.to, { orderBy: 'created_at' })
  const [dashboardDaily] = useSupabaseList('daily_three_entries', dailyThreeEntries, rowMappers.dailyThree.from, rowMappers.dailyThree.to, { orderBy: 'entry_date' })
  const [dashboardVisit] = useNextVisitState(nextVisitPlan)
  const [dashboardTrips] = useSupabaseTrips(getConfiguredTrips(countdownEvents))
  const latestMemory = dashboardMemories[0] || memories[0]
  const latestNote = dashboardNotes[0] || notes[0]
  const nextAnniversaryDate = getNextEventDate({ date: importantDates.anniversary, repeats: 'yearly' })
  const anniversaryDays = getTimeRemaining(nextAnniversaryDate).days
  const completeCount = dashboardBucket.filter((item) => item.status === 'completed').length
  const progress = dashboardBucket.length ? Math.round((completeCount / dashboardBucket.length) * 100) : 0
  const visitTargetDate = new Date(`${dashboardVisit.startDate || nextVisitPlan.startDate}T${dashboardVisit.arrivalTime || '00:00'}`)
  const visitDays = getTimeRemaining(visitTargetDate).days
  const today = new Date().toISOString().slice(0, 10)
  const todaysDailyCount = [couple.personOne, couple.personTwo].filter((person) =>
    dashboardDaily.some((entry) => entry.date === today && entry.author === person),
  ).length
  const upcomingEvents = getCountdownEventItems(
    countdownEvents.map((event) => (event.category === 'next-trip' ? { ...event, trips: dashboardTrips } : event)),
  )
    .map((event) => ({ ...event, nextDate: getNextEventDate(event) }))
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
  const upcomingCountdown = upcomingEvents[0]

  return (
    <section className="page home-page">
      <div className="hero-panel" style={{ '--hero-background': `url(${heroBackground})` }}>
        <div>
          <p className="eyebrow">{couple.homeBaseOne} / {couple.homeBaseTwo}</p>
          <h1>{couple.personOne} & {couple.personTwo}</h1>
          <p className="hero-copy">
            The hub of Joey and Lera's Relationship
          </p>
        </div>
        <div className="anniversary-card">
          <span>Next visit</span>
          <strong>{visitDays}</strong>
          <p>days until {dashboardVisit.city || 'we are together again'}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <FeatureCard eyebrow="Next visit" title={dashboardVisit.title || 'Next visit'} icon={Plane}>
          <p>{dashboardVisit.city ? `${dashboardVisit.city} is on the calendar.` : 'The next hug can be planned here.'}</p>
          <small><MapPinned size={14} /> {formatCountdownDate(visitTargetDate)}</small>
        </FeatureCard>

        <FeatureCard eyebrow="Latest memory" title={latestMemory.title} icon={CalendarHeart}>
          <p>{latestMemory.description}</p>
          <small><MapPinned size={14} /> {latestMemory.location} / {formatDate(latestMemory.date)}</small>
        </FeatureCard>

        <FeatureCard eyebrow="Latest note" title={`From ${latestNote.author}`} icon={MessageCircleHeart}>
          <p>{latestNote.message}</p>
          <small>{formatDateTime(latestNote.dateTime)}</small>
        </FeatureCard>

        <FeatureCard eyebrow="Daily 3" title={`${todaysDailyCount} of 2 today`} icon={Feather}>
          <p>{todaysDailyCount === 2 ? 'Both of today’s little gratitude lists are saved.' : 'There is still space for today’s three small thank-yous.'}</p>
          <small><Heart size={14} /> {formatDate(today)}</small>
        </FeatureCard>

        <FeatureCard eyebrow="Shared bucket list" title={`${progress}% complete`} icon={CheckCircle2}>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>{completeCount} of {dashboardBucket.length} little plans already done.</p>
        </FeatureCard>

        <FeatureCard eyebrow="Upcoming countdown" title={upcomingCountdown?.name || 'Anniversary'} icon={Clock3}>
          <p>{upcomingCountdown?.message || 'The next date worth keeping close.'}</p>
          <small>{upcomingCountdown ? formatCountdownDate(upcomingCountdown.nextDate) : `${anniversaryDays} days`}</small>
        </FeatureCard>
      </div>

      <LegacyMigrationPanel />
    </section>
  )
}

function LegacyMigrationPanel() {
  const { approved, user } = useAuth()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const legacyKeys = [
    MEMORY_STORAGE_KEY,
    NOTE_STORAGE_KEY,
    TRIP_STORAGE_KEY,
    ALBUM_STORAGE_KEY,
    DATE_NIGHT_STORAGE_KEY,
    MAP_STORAGE_KEY,
    BUCKET_STORAGE_KEY,
    NEXT_VISIT_STORAGE_KEY,
    DAILY_THREE_STORAGE_KEY,
  ]
  const hasLegacyData = legacyKeys.some((key) => {
    try {
      return Boolean(window.localStorage.getItem(key))
    } catch {
      return false
    }
  })

  async function replaceTable(tableName, rows) {
    const { error: deleteError } = await supabase.from(tableName).delete().not('id', 'is', null)
    if (deleteError) throw deleteError
    if (!rows.length) return
    const { error: insertError } = await supabase.from(tableName).upsert(rows, { onConflict: 'id' })
    if (insertError) throw insertError
  }

  function readLegacy(key, fallback) {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  }

  async function importLegacyData() {
    if (!approved || !user) return
    setStatus('Importing saved local data...')
    setError('')

    try {
      const now = new Date().toISOString()
      const withMeta = (row) => ({ ...row, author_id: row.author_id || user.id, updated_at: now })

      await replaceTable('memories', readLegacy(MEMORY_STORAGE_KEY, []).map((item) => withMeta(rowMappers.memory.to(item))))
      await replaceTable('love_notes', readLegacy(NOTE_STORAGE_KEY, []).map((item) => withMeta(rowMappers.note.to(item))))
      await replaceTable('countdown_events', readLegacy(TRIP_STORAGE_KEY, []).map((trip) => withMeta({
        id: trip.id,
        event_type: 'next-trip',
        name: trip.name,
        event_date: trip.date,
        message: trip.message || '',
      })))
      await replaceTable('photos', readLegacy(ALBUM_STORAGE_KEY, []).map((item) => withMeta(rowMappers.photo.to(item))))
      await replaceTable('memory_locations', readLegacy(MAP_STORAGE_KEY, []).map((item) => withMeta(rowMappers.mapPin.to(item))))
      await replaceTable('bucket_list_items', readLegacy(BUCKET_STORAGE_KEY, []).map((item) => withMeta(rowMappers.bucket.to(item))))
      await replaceTable('daily_three_entries', readLegacy(DAILY_THREE_STORAGE_KEY, []).map((item) => withMeta(rowMappers.dailyThree.to(item))))

      const savedDateNight = readLegacy(DATE_NIGHT_STORAGE_KEY, { favorites: [], completed: [] })
      const ideaIds = [...new Set([...(savedDateNight.favorites || []), ...(savedDateNight.completed || [])])]
      await supabase.from('favorite_date_ideas').delete().not('idea_id', 'is', null)
      const favoriteRows = ideaIds.map((ideaId) => withMeta({
        idea_id: ideaId,
        is_favorite: (savedDateNight.favorites || []).includes(ideaId),
        is_completed: (savedDateNight.completed || []).includes(ideaId),
      }))
      if (favoriteRows.length) {
        const { error: favoritesError } = await supabase.from('favorite_date_ideas').upsert(favoriteRows, { onConflict: 'idea_id' })
        if (favoritesError) throw favoritesError
      }

      const savedVisit = readLegacy(NEXT_VISIT_STORAGE_KEY, null)
      if (savedVisit) {
        await supabase.from('next_visits').upsert(withMeta({
          id: savedVisit.id,
          title: savedVisit.title,
          start_date: savedVisit.startDate,
          end_date: savedVisit.endDate,
          city: savedVisit.city,
          arrival_time: savedVisit.arrivalTime || null,
          departure_time: savedVisit.departureTime || null,
          travel_notes: savedVisit.travelNotes || '',
        }), { onConflict: 'id' })
        await replaceTable('visit_itinerary_items', (savedVisit.itinerary || []).map((item) => withMeta({
          id: item.id,
          visit_id: savedVisit.id,
          date: item.date,
          time: item.time || null,
          title: item.title,
          location: item.location || '',
          notes: item.notes || '',
          category: item.category || 'other',
        })))
        await replaceTable('visit_checklist_items', [
          ...(savedVisit.packing || []).map((item) => ({ ...item, list_type: 'packing', label: item.label || item.text })),
          ...(savedVisit.wishList || []).map((item) => ({ ...item, list_type: 'wish', label: item.label || item.text })),
        ].map((item) => withMeta({
          id: item.id,
          visit_id: savedVisit.id,
          list_type: item.list_type,
          label: item.label,
          done: Boolean(item.done),
        })))
      }

      setStatus('Local data imported. Refresh the app to load it from Supabase.')
    } catch (importError) {
      setError(importError.message)
      setStatus('')
    }
  }

  if (!hasLegacyData) return null

  return (
    <section className="migration-panel">
      <div>
        <p className="eyebrow">One-time migration</p>
        <h2>Move this browser’s saved data to Supabase</h2>
        <p>Use this once after the database schema is installed. It uploads existing localStorage data so both devices can share it.</p>
      </div>
      {error && <p className="form-error">{error}</p>}
      {status && <p className="form-success">{status}</p>}
      <button className="primary-action" type="button" onClick={importLegacyData}>
        <Upload size={18} />
        <span>Import local data</span>
      </button>
    </section>
  )
}

function FeatureCard({ eyebrow, title, icon: Icon, children }) {
  return (
    <article className="feature-card">
      <div className="card-heading">
        <span className="icon-pill"><Icon size={18} /></span>
        <p>{eyebrow}</p>
      </div>
      <h2>{title}</h2>
      {children}
    </article>
  )
}

function DataStatus({ state, count, emptyMessage }) {
  if (!state) return null
  if (state.loading) {
    return <p className="data-status">Loading shared Supabase data...</p>
  }
  if (state.error) {
    return <p className="data-status error">{state.error}</p>
  }
  if (count === 0 && emptyMessage) {
    return <p className="data-status">{emptyMessage}</p>
  }
  return null
}

function TimelinePage() {
  const [storedMemories, setStoredMemories, memoryState] = useSupabaseList(
    'memories',
    memories,
    rowMappers.memory.from,
    rowMappers.memory.to,
    { orderBy: 'memory_date' },
  )
  const [activeCategory, setActiveCategory] = useState('all')
  const [form, setForm] = useState(emptyMemoryForm)
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [timelineNotice, setTimelineNotice] = useState(null)
  const [highlightedMemoryId, setHighlightedMemoryId] = useState(null)
  const [deletingMemoryIds, setDeletingMemoryIds] = useState([])
  const noticeTimeoutRef = useRef(null)
  const highlightTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      clearTimeout(noticeTimeoutRef.current)
      clearTimeout(highlightTimeoutRef.current)
    }
  }, [])

  const chronologicalMemories = useMemo(
    () =>
      [...storedMemories]
        .filter((memory) => activeCategory === 'all' || memory.category === activeCategory)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [activeCategory, storedMemories],
  )

  function handleFieldChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function resetForm() {
    setForm(emptyMemoryForm)
    setEditingId(null)
    setIsFormOpen(false)
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyMemoryForm)
    setIsFormOpen(true)
  }

  function showTimelineNotice(message, tone = 'added') {
    clearTimeout(noticeTimeoutRef.current)
    setTimelineNotice({ message, tone })
    noticeTimeoutRef.current = setTimeout(() => setTimelineNotice(null), 2600)
  }

  function highlightMemory(memoryId) {
    clearTimeout(highlightTimeoutRef.current)
    setHighlightedMemoryId(memoryId)
    highlightTimeoutRef.current = setTimeout(() => setHighlightedMemoryId(null), 1200)
  }

  function handleSubmit(event) {
    event.preventDefault()

    const cleanedMemory = {
      ...form,
      title: form.title.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      photo: form.photo.trim(),
    }

    if (!cleanedMemory.title || !cleanedMemory.date || !cleanedMemory.location || !cleanedMemory.description) {
      return
    }

    if (editingId) {
      setStoredMemories((current) =>
        current.map((memory) => (memory.id === editingId ? { ...cleanedMemory, id: editingId } : memory)),
      )
      highlightMemory(editingId)
      showTimelineNotice('Memory updated')
    } else {
      const newMemoryId = crypto.randomUUID()
      setStoredMemories((current) => [{ ...cleanedMemory, id: newMemoryId }, ...current])
      highlightMemory(newMemoryId)
      showTimelineNotice('Memory added')
    }

    resetForm()
  }

  function startEdit(memory) {
    setEditingId(memory.id)
    setIsFormOpen(true)
    setForm({
      title: memory.title,
      date: memory.date,
      location: memory.location,
      category: memory.category,
      description: memory.description,
      photo: memory.photo || '',
    })
  }

  function deleteMemory(memoryId) {
    setDeletingMemoryIds((current) => [...current, memoryId])
    showTimelineNotice('Memory deleted', 'deleted')

    window.setTimeout(() => {
      setStoredMemories((current) => current.filter((memory) => memory.id !== memoryId))
      setDeletingMemoryIds((current) => current.filter((id) => id !== memoryId))
    }, 280)

    if (editingId === memoryId) {
      resetForm()
    }
  }

  return (
    <PageScaffold title="Memory Timeline" subtitle="A soft record of places, calls, arrivals, and ordinary days that mattered.">
      <DataStatus state={memoryState} count={storedMemories.length} emptyMessage="No memories saved yet. Add the first one when you are ready." />
      {timelineNotice && (
        <div className={`timeline-notice ${timelineNotice.tone}`} role="status" aria-live="polite">
          <Sparkles size={18} />
          <span>{timelineNotice.message}</span>
        </div>
      )}

      <div className="timeline-layout">
        {isFormOpen && (
          <section className="memory-form-panel" aria-labelledby="memory-form-title">
            <div className="section-heading">
              <span className="icon-pill"><Plus size={18} /></span>
              <div>
                <p className="eyebrow">{editingId ? 'Editing memory' : 'Add memory'}</p>
                <h2 id="memory-form-title">{editingId ? 'Update this moment' : 'Save a new moment'}</h2>
              </div>
            </div>

            <form className="memory-form" onSubmit={handleSubmit}>
              <label>
                <span>Title</span>
                <input name="title" value={form.title} onChange={handleFieldChange} placeholder="The night we..." required />
              </label>

              <div className="form-row">
                <label>
                  <span>Date</span>
                  <input name="date" type="date" value={form.date} onChange={handleFieldChange} required />
                </label>
                <label>
                  <span>Category</span>
                  <select name="category" value={form.category} onChange={handleFieldChange}>
                    {memoryCategories.map((category) => (
                      <option key={category} value={category}>{toTitleCase(category)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <span>Location</span>
                <input name="location" value={form.location} onChange={handleFieldChange} placeholder="Toronto, Calgary, FaceTime..." required />
              </label>

              <label>
                <span>Description</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFieldChange}
                  placeholder="What made this worth remembering?"
                  rows="4"
                  required
                />
              </label>

              <label>
                <span>Optional photo URL</span>
                <input name="photo" value={form.photo} onChange={handleFieldChange} placeholder="https://..." />
              </label>

              <div className="form-actions">
                <button className="primary-action" type="submit">
                  <Save size={18} />
                  <span>{editingId ? 'Save changes' : 'Add memory'}</span>
                </button>
                <button className="secondary-action" type="button" onClick={resetForm}>
                  <X size={18} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="memory-timeline-panel">
          <div className="timeline-toolbar">
            <div>
              <p className="eyebrow">Chronological timeline</p>
              <h2>{chronologicalMemories.length} memories</h2>
            </div>
            <button className="add-memory-button" type="button" onClick={openCreateForm}>
              <Plus size={18} />
              <span>Add memory</span>
            </button>
            <div className="category-filters" aria-label="Filter memories by category">
              {['all', ...memoryCategories].map((category) => (
                <button
                  className={activeCategory === category ? 'filter-chip active' : 'filter-chip'}
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory((current) => toggleFilterValue(current, category))}
                >
                  {toTitleCase(category)}
                </button>
              ))}
            </div>
          </div>

          <div className="timeline-list relationship-timeline">
            {chronologicalMemories.map((memory) => (
              <article
                className={[
                  'timeline-item',
                  'memory-item',
                  highlightedMemoryId === memory.id ? 'memory-item-added' : '',
                  deletingMemoryIds.includes(memory.id) ? 'memory-item-deleting' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={memory.id}
              >
                <span className="timeline-dot" />
                <div className="memory-card">
                  {memory.photo && (
                    <img className="memory-photo" src={memory.photo} alt="" />
                  )}
                  <div className="memory-meta">
                    <span>{formatDate(memory.date)}</span>
                    <span>{toTitleCase(memory.category)}</span>
                  </div>
                  <h2>{memory.title}</h2>
                  <p>{memory.description}</p>
                  <small><MapPinned size={14} /> {memory.location}</small>
                  <div className="memory-actions">
                    <button type="button" onClick={() => startEdit(memory)} aria-label={`Edit ${memory.title}`}>
                      <Edit3 size={17} />
                      <span>Edit</span>
                    </button>
                    <button type="button" onClick={() => deleteMemory(memory.id)} aria-label={`Delete ${memory.title}`}>
                      <Trash2 size={17} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageScaffold>
  )
}

function toTitleCase(value) {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function toggleFilterValue(currentValue, selectedValue) {
  return currentValue === selectedValue ? 'all' : selectedValue
}

function NotesPage() {
  const [storedNotes, setStoredNotes, notesState] = useSupabaseList(
    'love_notes',
    notes,
    rowMappers.note.from,
    rowMappers.note.to,
    { orderBy: 'note_time' },
  )
  const [noteForm, setNoteForm] = useState(emptyNoteForm)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [isNoteFormOpen, setIsNoteFormOpen] = useState(false)
  const [highlightedNoteId, setHighlightedNoteId] = useState(null)
  const [deletingNoteIds, setDeletingNoteIds] = useState([])
  const noteHighlightTimeoutRef = useRef(null)

  useEffect(() => {
    return () => clearTimeout(noteHighlightTimeoutRef.current)
  }, [])

  const orderedNotes = useMemo(
    () => [...storedNotes].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()),
    [storedNotes],
  )

  function handleNoteFieldChange(event) {
    const { name, value } = event.target
    setNoteForm((current) => ({ ...current, [name]: value }))
  }

  function resetNoteForm() {
    setNoteForm(emptyNoteForm)
    setEditingNoteId(null)
    setIsNoteFormOpen(false)
  }

  function openNoteForm() {
    setEditingNoteId(null)
    setNoteForm(emptyNoteForm)
    setIsNoteFormOpen(true)
  }

  function highlightNote(noteId) {
    clearTimeout(noteHighlightTimeoutRef.current)
    setHighlightedNoteId(noteId)
    noteHighlightTimeoutRef.current = setTimeout(() => setHighlightedNoteId(null), 1200)
  }

  function handleNoteSubmit(event) {
    event.preventDefault()

    const cleanedNote = {
      message: noteForm.message.trim(),
      author: noteForm.author,
      mood: noteForm.mood.trim(),
    }

    if (!cleanedNote.message || !cleanedNote.author) {
      return
    }

    if (editingNoteId) {
      setStoredNotes((current) =>
        current.map((note) =>
          note.id === editingNoteId
            ? {
                ...note,
                ...cleanedNote,
              }
            : note,
        ),
      )
      highlightNote(editingNoteId)
    } else {
      const newNoteId = crypto.randomUUID()
      setStoredNotes((current) => [
        {
          ...cleanedNote,
          id: newNoteId,
          dateTime: new Date().toISOString(),
        },
        ...current,
      ])
      highlightNote(newNoteId)
    }

    resetNoteForm()
  }

  function startNoteEdit(note) {
    setEditingNoteId(note.id)
    setIsNoteFormOpen(true)
    setNoteForm({
      message: note.message,
      author: note.author,
      mood: note.mood || 'soft',
    })
  }

  function deleteNote(noteId) {
    setDeletingNoteIds((current) => [...current, noteId])
    window.setTimeout(() => {
      setStoredNotes((current) => current.filter((note) => note.id !== noteId))
      setDeletingNoteIds((current) => current.filter((id) => id !== noteId))
    }, 240)

    if (editingNoteId === noteId) {
      resetNoteForm()
    }
  }

  return (
    <PageScaffold title="Love Notes Wall" subtitle="Short notes, saved for the days when one of us needs the extra softness.">
      <DataStatus state={notesState} count={storedNotes.length} emptyMessage="No notes yet. Leave the first private note." />
      <div className="notes-layout">
        {isNoteFormOpen && (
          <section className="note-composer" aria-labelledby="note-composer-title">
            <div className="section-heading">
              <span className="icon-pill"><LockKeyhole size={18} /></span>
              <div>
                <p className="eyebrow">Just for us</p>
                <h2 id="note-composer-title">{editingNoteId ? 'Edit this note' : 'Leave a note'}</h2>
              </div>
            </div>

            <form className="memory-form note-form" onSubmit={handleNoteSubmit}>
              <label>
                <span>Message</span>
                <textarea
                  name="message"
                  value={noteForm.message}
                  onChange={handleNoteFieldChange}
                  placeholder="Write something small and true..."
                  rows="5"
                  maxLength="280"
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  <span>From</span>
                  <select name="author" value={noteForm.author} onChange={handleNoteFieldChange}>
                    <option value={couple.personOne}>{couple.personOne}</option>
                    <option value={couple.personTwo}>{couple.personTwo}</option>
                  </select>
                </label>
                <label>
                  <span>Mood / tag</span>
                  <select name="mood" value={noteForm.mood} onChange={handleNoteFieldChange}>
                    {noteMoods.map((mood) => (
                      <option key={mood} value={mood}>{toTitleCase(mood)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="composer-footer">
                <small>{noteForm.message.length}/280</small>
                <div className="form-actions">
                  <button className="primary-action" type="submit">
                    <Save size={18} />
                    <span>{editingNoteId ? 'Save note' : 'Post note'}</span>
                  </button>
                  <button className="secondary-action" type="button" onClick={resetNoteForm}>
                    <X size={18} />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        <section className="notes-wall" aria-label="Private love notes">
          <div className="notes-toolbar">
            <div>
              <p className="eyebrow">Private notes</p>
              <h2>{orderedNotes.length} saved notes</h2>
            </div>
            <button className="add-memory-button" type="button" onClick={openNoteForm}>
              <MessageCircleHeart size={18} />
              <span>Leave note</span>
            </button>
          </div>

          {orderedNotes.map((note, index) => (
            <article
              className={[
                'note-card',
                `note-card-${index % 4}`,
                highlightedNoteId === note.id ? 'note-card-new' : '',
                deletingNoteIds.includes(note.id) ? 'note-card-deleting' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={note.id}
            >
              <div className="note-card-topline">
                <span>{note.mood ? toTitleCase(note.mood) : 'Private'}</span>
                <LockKeyhole size={14} />
              </div>
              <p>{note.message}</p>
              <footer>
                <div>
                  <strong>{note.author}</strong>
                  <small>{formatDateTime(note.dateTime)}</small>
                </div>
                <div className="memory-actions note-actions">
                  <button type="button" onClick={() => startNoteEdit(note)} aria-label={`Edit note from ${note.author}`}>
                    <Edit3 size={16} />
                    <span>Edit</span>
                  </button>
                  <button type="button" onClick={() => deleteNote(note.id)} aria-label={`Delete note from ${note.author}`}>
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </section>
      </div>
    </PageScaffold>
  )
}

function CountdownsPage() {
  const [now, setNow] = useState(() => new Date())
  const [trips, setTrips, tripsState] = useSupabaseTrips(getConfiguredTrips(countdownEvents))
  const [editingTripId, setEditingTripId] = useState(null)
  const [tripDateDraft, setTripDateDraft] = useState('')

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  const countdownSource = useMemo(
    () =>
      countdownEvents.map((event) =>
        event.category === 'next-trip'
          ? {
              ...event,
              trips,
            }
          : event,
      ),
    [trips],
  )

  const countdowns = useMemo(
    () =>
      getCountdownEventItems(countdownSource)
        .map((event) => {
          const nextDate = getNextEventDate(event, now)
          return {
            ...event,
            nextDate,
            remaining: getTimeRemaining(nextDate, now),
          }
        })
        .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime()),
    [countdownSource, now],
  )

  const anniversaryEvent = getAnniversaryEvent(countdownEvents)
  const mainCountdownDate = getNextEventDate(anniversaryEvent, now)
  const mainCountdown = {
    ...anniversaryEvent,
    nextDate: mainCountdownDate,
    remaining: getTimeRemaining(mainCountdownDate, now),
  }
  const nextUpcomingId = countdowns[0]?.id

  function resetTripEdit() {
    setEditingTripId(null)
    setTripDateDraft('')
  }

  function handleTripDateSubmit(event, tripId) {
    event.preventDefault()

    if (!tripDateDraft) {
      return
    }

    setTrips((current) =>
      current.map((trip) => (trip.id === tripId ? { ...trip, date: tripDateDraft } : trip)),
    )

    resetTripEdit()
  }

  function startTripEdit(trip) {
    setEditingTripId(trip.id)
    setTripDateDraft(trip.date)
  }

  return (
    <PageScaffold title="Countdowns" subtitle="The next reasons to pack, plan, celebrate, and stay awake a little too late.">
      <DataStatus state={tripsState} count={trips.length} emptyMessage="No next trip is saved yet. Edit the next trip date when you book one." />
      <div className="countdown-page-layout">
        <section className="main-countdown-card" aria-label={`Main countdown to ${mainCountdown.name}`}>
          <div>
            <p className="eyebrow">Anniversary countdown</p>
            <h2>{mainCountdown.name}</h2>
            <p>{formatCountdownDate(mainCountdown.nextDate)}</p>
          </div>

          <div className="countdown-clock" aria-label={`${mainCountdown.remaining.days} days, ${mainCountdown.remaining.hours} hours, ${mainCountdown.remaining.minutes} minutes, and ${mainCountdown.remaining.seconds} seconds`}>
            <TimeBlock label="Days" value={mainCountdown.remaining.days} />
            <TimeBlock label="Hours" value={mainCountdown.remaining.hours} />
            <TimeBlock label="Minutes" value={mainCountdown.remaining.minutes} />
            <TimeBlock label="Seconds" value={mainCountdown.remaining.seconds} />
          </div>

          <p className="countdown-message">{mainCountdown.message}</p>
        </section>

        <div className="countdown-grid">
          {countdowns.map((event) => (
            <article className={event.id === nextUpcomingId ? 'countdown-tile next-event' : 'countdown-tile'} key={event.id}>
              <Clock3 className="countdown-card-icon" size={18} />
              <h2>{event.name}</h2>
              <strong>{event.remaining.days}</strong>
              <p>days until {formatCountdownDate(event.nextDate)}</p>
              <small>{event.message}</small>
              {event.category === 'next-trip' && (
                <div className="trip-inline-editor">
                  {editingTripId === event.id ? (
                    <form onSubmit={(submitEvent) => handleTripDateSubmit(submitEvent, event.id)}>
                      <label>
                        <span>Trip date</span>
                        <input
                          type="date"
                          value={tripDateDraft}
                          onChange={(changeEvent) => setTripDateDraft(changeEvent.target.value)}
                          required
                        />
                      </label>
                      <div className="memory-actions trip-actions">
                        <button type="submit">
                          <Save size={16} />
                          <span>Save</span>
                        </button>
                        <button type="button" onClick={resetTripEdit}>
                          <X size={16} />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button className="inline-edit-button" type="button" onClick={() => startTripEdit(event)}>
                      <Edit3 size={16} />
                      <span>Edit date</span>
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </PageScaffold>
  )
}

function TimeBlock({ label, value }) {
  return (
    <div className="time-block">
      <strong>{String(value).padStart(2, '0')}</strong>
      <span>{label}</span>
    </div>
  )
}

function AlbumPage() {
  const { user } = useAuth()
  const [photos, setPhotos, photoState] = useSupabaseList(
    'photos',
    albumPhotos,
    rowMappers.photo.from,
    rowMappers.photo.to,
    { orderBy: 'photo_date' },
  )
  const [photoForm, setPhotoForm] = useState(emptyPhotoForm)
  const [isPhotoFormOpen, setIsPhotoFormOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  const filteredPhotos = useMemo(
    () =>
      [...photos]
        .filter((photo) => activeCategory === 'all' || photo.category === activeCategory)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [activeCategory, photos],
  )

  function handlePhotoFieldChange(event) {
    const { name, value } = event.target
    setPhotoForm((current) => ({ ...current, [name]: value }))
  }

  async function handlePhotoFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (supabase && user) {
      const extension = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('photos').upload(path, file, { upsert: false })
      if (!uploadError) {
        setPhotoForm((current) => ({ ...current, image: `storage:${path}` }))
        return
      }
    }

    const reader = new FileReader()
    reader.onload = () => setPhotoForm((current) => ({ ...current, image: reader.result }))
    reader.readAsDataURL(file)
  }

  function handlePhotoSubmit(event) {
    event.preventDefault()

    const cleanedPhoto = {
      caption: photoForm.caption.trim(),
      date: photoForm.date,
      category: photoForm.category,
      image: photoForm.image,
    }

    if (!cleanedPhoto.caption || !cleanedPhoto.date || !cleanedPhoto.image) {
      return
    }

    setPhotos((current) => [{ ...cleanedPhoto, id: crypto.randomUUID() }, ...current])
    setPhotoForm(emptyPhotoForm)
    setIsPhotoFormOpen(false)
  }

  function handlePhotoFormCancel() {
    setPhotoForm(emptyPhotoForm)
    setIsPhotoFormOpen(false)
  }

  return (
    <PageScaffold title="Photo Album" subtitle="A private gallery for trips, calls, tiny rituals, and proof that the distance is real but not everything.">
      <DataStatus state={photoState} count={photos.length} emptyMessage="No photos saved yet. Add one when you have a moment worth keeping." />
      <div className="album-layout">
        {isPhotoFormOpen && (
          <section className="photo-uploader" aria-labelledby="photo-uploader-title">
            <div className="section-heading">
              <span className="icon-pill"><ImagePlus size={18} /></span>
              <div>
                <p className="eyebrow">Local album</p>
                <h2 id="photo-uploader-title">Add a photo</h2>
              </div>
            </div>

            <form className="memory-form photo-form" onSubmit={handlePhotoSubmit}>
              <label className="file-drop">
                <Upload size={22} />
                <span>{photoForm.image ? 'Image selected' : 'Select image'}</span>
                <small>Stored locally for now; ready to swap to Supabase storage later.</small>
                <input type="file" accept="image/*" onChange={handlePhotoFileChange} />
              </label>

              {photoForm.image && (
                <div className="upload-preview" style={{ backgroundImage: `url(${photoForm.image})` }} aria-hidden="true" />
              )}

              <label>
                <span>Caption</span>
                <input name="caption" value={photoForm.caption} onChange={handlePhotoFieldChange} placeholder="What should this remember?" required />
              </label>

              <div className="form-row">
                <label>
                  <span>Date</span>
                  <input name="date" type="date" value={photoForm.date} onChange={handlePhotoFieldChange} required />
                </label>
                <label>
                  <span>Category</span>
                  <select name="category" value={photoForm.category} onChange={handlePhotoFieldChange}>
                    {albumCategories.map((category) => (
                      <option key={category} value={category}>{toTitleCase(category)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-actions">
                <button className="primary-action" type="submit">
                  <Save size={18} />
                  <span>Add photo</span>
                </button>
                <button className="secondary-action" type="button" onClick={handlePhotoFormCancel}>
                  <X size={18} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="album-gallery" aria-label="Photo gallery">
          <div className="album-toolbar">
            <div>
              <p className="eyebrow">Gallery</p>
              <h2>{filteredPhotos.length} photos</h2>
            </div>
            <button className="add-memory-button" type="button" onClick={() => setIsPhotoFormOpen(true)}>
              <ImagePlus size={18} />
              <span>Add photo</span>
            </button>
            <div className="category-filters" aria-label="Filter photos by category">
              {['all', ...albumCategories].map((category) => (
                <button
                  className={activeCategory === category ? 'filter-chip active' : 'filter-chip'}
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory((current) => toggleFilterValue(current, category))}
                >
                  {toTitleCase(category)}
                </button>
              ))}
            </div>
          </div>

          <div className="photo-grid">
            {filteredPhotos.map((photo, index) => (
              <button className="photo-card" type="button" key={photo.id} onClick={() => setSelectedPhoto(photo)}>
                <PhotoImage photo={photo} index={index} />
                <span>{toTitleCase(photo.category)}</span>
                <p>{photo.caption}</p>
                <small>{formatDate(photo.date)}</small>
              </button>
            ))}
          </div>
        </section>
      </div>

      {selectedPhoto && (
        <div className="lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Photo preview" onClick={() => setSelectedPhoto(null)}>
          <div className="lightbox-panel" onClick={(event) => event.stopPropagation()}>
            <button className="lightbox-close" type="button" onClick={() => setSelectedPhoto(null)} aria-label="Close photo preview">
              <X size={20} />
            </button>
            <div className="lightbox-image">
              <PhotoImage photo={selectedPhoto} index={0} />
            </div>
            <div className="lightbox-copy">
              <span>{toTitleCase(selectedPhoto.category)}</span>
              <h2>{selectedPhoto.caption}</h2>
              <p>{formatDate(selectedPhoto.date)}</p>
            </div>
          </div>
        </div>
      )}
    </PageScaffold>
  )
}

function PhotoImage({ photo, index }) {
  if (photo.image.startsWith('linear-gradient')) {
    return (
      <div className={`photo-generated photo-generated-${index % 4}`} style={{ background: photo.image }}>
        <Camera size={28} />
      </div>
    )
  }

  if (photo.image.startsWith('storage:')) {
    return <SignedStorageImage path={photo.image.replace('storage:', '')} />
  }

  return <img src={photo.image} alt="" loading="lazy" />
}

function SignedStorageImage({ path }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadSignedUrl() {
      if (!supabase || !path) return
      const { data } = await supabase.storage.from('photos').createSignedUrl(path, 3600)
      if (isMounted) setSrc(data?.signedUrl || '')
    }

    loadSignedUrl()

    return () => {
      isMounted = false
    }
  }, [path])

  if (!src) {
    return (
      <div className="photo-generated">
        <Camera size={28} />
      </div>
    )
  }

  return <img src={src} alt="" loading="lazy" />
}

function DateNightPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedIdea, setSelectedIdea] = useState(() => dateNightIdeas[0])
  const [spinKey, setSpinKey] = useState(0)
  const [savedState, setSavedState, dateNightState] = useDateNightState({ favorites: [], completed: [] })

  const filteredIdeas = useMemo(
    () => dateNightIdeas.filter((idea) => activeCategory === 'all' || idea.category === activeCategory),
    [activeCategory],
  )
  const favoriteCount = savedState.favorites.length
  const completedCount = savedState.completed.length
  const isFavorite = savedState.favorites.includes(selectedIdea.id)
  const isCompleted = savedState.completed.includes(selectedIdea.id)

  function generateIdea() {
    if (filteredIdeas.length === 0) return

    const currentPool = filteredIdeas.length > 1 ? filteredIdeas.filter((idea) => idea.id !== selectedIdea.id) : filteredIdeas
    const nextIdea = currentPool[Math.floor(Math.random() * currentPool.length)]
    setSelectedIdea(nextIdea)
    setSpinKey((current) => current + 1)
  }

  function toggleSavedState(type, ideaId) {
    setSavedState((current) => {
      const exists = current[type].includes(ideaId)
      return {
        ...current,
        [type]: exists ? current[type].filter((id) => id !== ideaId) : [...current[type], ideaId],
      }
    })
  }

  return (
    <PageScaffold title="Date Night Generator" subtitle="Small ideas for same-city weekends and long-distance nights.">
      <DataStatus state={dateNightState} count={savedState.favorites.length + savedState.completed.length} />
      <div className="date-night-layout">
        <section className="date-generator-panel">
          <div className="date-generator-heading">
            <div>
              <p className="eyebrow">Tonight's pull</p>
              <h2>Pick a category, then let the app choose.</h2>
            </div>
            <div className="date-stats">
              <span><Heart size={15} /> {favoriteCount}</span>
              <span><CheckCircle2 size={15} /> {completedCount}</span>
            </div>
          </div>

          <div className="category-filters date-category-filters" aria-label="Choose date night category">
            {['all', ...dateNightCategories].map((category) => (
              <button
                className={activeCategory === category ? 'filter-chip active' : 'filter-chip'}
                key={category}
                type="button"
                onClick={() => setActiveCategory((current) => toggleFilterValue(current, category))}
              >
                {toTitleCase(category)}
              </button>
            ))}
          </div>

          <button className="generate-date-button" type="button" onClick={generateIdea}>
            <Sparkles size={22} />
            <span>Generate date idea</span>
          </button>
        </section>

        <section className="date-idea-card" key={spinKey}>
          <div className="date-idea-topline">
            <span>{toTitleCase(selectedIdea.category)}</span>
            <Sparkles size={18} />
          </div>
          <h2>{selectedIdea.title}</h2>
          <div className="idea-meta-grid">
            <div>
              <span>Estimated time</span>
              <strong>{selectedIdea.estimatedTime}</strong>
            </div>
            <div>
              <span>What we need</span>
              <strong>{selectedIdea.needs.join(', ')}</strong>
            </div>
          </div>
          <div className="idea-instructions">
            <span>Instructions</span>
            <p>{selectedIdea.instructions}</p>
          </div>
          <div className="date-idea-actions">
            <button
              className={isFavorite ? 'state-action active' : 'state-action'}
              type="button"
              onClick={() => toggleSavedState('favorites', selectedIdea.id)}
            >
              <Heart size={18} />
              <span>{isFavorite ? 'Favorited' : 'Save to favorites'}</span>
            </button>
            <button
              className={isCompleted ? 'state-action active' : 'state-action'}
              type="button"
              onClick={() => toggleSavedState('completed', selectedIdea.id)}
            >
              <CheckCircle2 size={18} />
              <span>{isCompleted ? 'Completed' : 'Mark completed'}</span>
            </button>
          </div>
        </section>

        <section className="date-idea-library">
          <div className="section-heading">
            <span className="icon-pill"><Sparkles size={18} /></span>
            <div>
              <p className="eyebrow">Idea library</p>
              <h2>{filteredIdeas.length} ideas available</h2>
            </div>
          </div>
          <div className="mini-idea-grid">
            {filteredIdeas.slice(0, 8).map((idea) => (
              <article className="mini-idea-card" key={idea.id}>
                <span>{toTitleCase(idea.category)}</span>
                <strong>{idea.title}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageScaffold>
  )
}

function MapPage() {
  const [pins, setPins, mapState] = useSupabaseList(
    'memory_locations',
    memoryMapPins,
    rowMappers.mapPin.from,
    rowMappers.mapPin.to,
    { orderBy: 'memory_date' },
  )
  const [pinForm, setPinForm] = useState(emptyMapPinForm)
  const [activeType, setActiveType] = useState('all')
  const [mapFormError, setMapFormError] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isMapFormOpen, setIsMapFormOpen] = useState(false)

  const filteredPins = useMemo(
    () =>
      [...pins]
        .filter((pin) => activeType === 'all' || pin.memoryType === activeType)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [activeType, pins],
  )

  const mapCenter = filteredPins.length
    ? [filteredPins[0].latitude, filteredPins[0].longitude]
    : [47.5, -97.5]

  function handlePinFieldChange(event) {
    const { name, value } = event.target
    setPinForm((current) => ({ ...current, [name]: value }))
  }

  async function handlePinSubmit(event) {
    event.preventDefault()

    if (
      !pinForm.placeName.trim() ||
      !pinForm.locationQuery.trim() ||
      !pinForm.date ||
      !pinForm.description.trim()
    ) {
      return
    }

    setMapFormError('')
    setIsGeocoding(true)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(pinForm.locationQuery.trim())}`,
      )
      const results = await response.json()
      const match = results[0]

      if (!match) {
        setMapFormError('No location found. Try adding the city, province, or country.')
        return
      }

      setPins((current) => [
        {
          id: crypto.randomUUID(),
          placeName: pinForm.placeName.trim(),
          locationQuery: pinForm.locationQuery.trim(),
          date: pinForm.date,
          latitude: Number(match.lat),
          longitude: Number(match.lon),
          description: pinForm.description.trim(),
          photo: pinForm.photo.trim(),
          memoryType: pinForm.memoryType,
        },
        ...current,
      ])
      setPinForm(emptyMapPinForm)
      setIsMapFormOpen(false)
    } catch {
      setMapFormError('Could not look up that location right now. Check the address and try again.')
    } finally {
      setIsGeocoding(false)
    }
  }

  return (
    <PageScaffold title="Map of Memories" subtitle="A private map of places that matter, searchable by address or location name.">
      <DataStatus state={mapState} count={pins.length} emptyMessage="No map pins yet. Add a place that matters." />
      <div className="memory-map-layout">
        <section className="memory-map-panel">
          <div className="map-filter-bar">
            <div>
              <p className="eyebrow">OpenStreetMap</p>
              <h2>{filteredPins.length} pinned places</h2>
            </div>
            <button className="add-memory-button" type="button" onClick={() => setIsMapFormOpen(true)}>
              <MapPinned size={18} />
              <span>Add Pin</span>
            </button>
            <div className="category-filters" aria-label="Filter map pins by memory type">
              {['all', ...mapMemoryTypes].map((type) => (
                <button
                  className={activeType === type ? 'filter-chip active' : 'filter-chip'}
                  key={type}
                  type="button"
                  onClick={() => setActiveType((current) => toggleFilterValue(current, type))}
                >
                  {toTitleCase(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="leaflet-map-shell">
            <MapContainer center={mapCenter} zoom={5} scrollWheelZoom className="leaflet-map" key={`${mapCenter[0]}-${mapCenter[1]}-${activeType}`}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredPins.map((pin) => (
                <Marker key={pin.id} position={[pin.latitude, pin.longitude]}>
                  <Popup>
                    <div className="map-popup">
                      {pin.photo && <img src={pin.photo} alt="" />}
                      <strong>{pin.placeName}</strong>
                      <span>{formatDate(pin.date)} / {toTitleCase(pin.memoryType)}</span>
                      <p>{pin.description}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </section>

        {isMapFormOpen && (
          <section className="map-form-panel" aria-labelledby="map-form-title">
            <div className="section-heading">
              <span className="icon-pill"><MapPinned size={18} /></span>
              <div>
                <p className="eyebrow">Add location</p>
                <h2 id="map-form-title">Pin a memory</h2>
              </div>
            </div>

            <form className="memory-form map-pin-form" onSubmit={handlePinSubmit}>
              <label>
                <span>Place name</span>
                <input name="placeName" value={pinForm.placeName} onChange={handlePinFieldChange} placeholder="Coffee shop, airport, park..." required />
              </label>

              <label>
                <span>Address or location</span>
                <input name="locationQuery" value={pinForm.locationQuery} onChange={handlePinFieldChange} placeholder="CN Tower, Toronto or Calgary airport" required />
              </label>

              <div className="form-row">
                <label>
                  <span>Date</span>
                  <input name="date" type="date" value={pinForm.date} onChange={handlePinFieldChange} required />
                </label>
                <label>
                  <span>Memory type</span>
                  <select name="memoryType" value={pinForm.memoryType} onChange={handlePinFieldChange}>
                    {mapMemoryTypes.map((type) => (
                      <option key={type} value={type}>{toTitleCase(type)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <span>Description</span>
                <textarea name="description" value={pinForm.description} onChange={handlePinFieldChange} rows="4" placeholder="What happened here?" required />
              </label>

              <label>
                <span>Optional photo URL</span>
                <input name="photo" value={pinForm.photo} onChange={handlePinFieldChange} placeholder="https://..." />
              </label>

              {mapFormError && <p className="form-error">{mapFormError}</p>}

              <div className="form-actions">
                <button className="primary-action" type="submit" disabled={isGeocoding}>
                  <Save size={18} />
                  <span>{isGeocoding ? 'Finding location...' : 'Add pin'}</span>
                </button>
                <button className="secondary-action" type="button" onClick={() => setIsMapFormOpen(false)}>
                  <X size={18} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="map-list-panel" aria-label="Pinned memory locations">
          {filteredPins.map((pin) => (
            <article className="map-list-item" key={pin.id}>
              {pin.photo ? <img src={pin.photo} alt="" /> : <span className="map-list-icon"><MapPinned size={20} /></span>}
              <div>
                <span>{toTitleCase(pin.memoryType)} / {formatDate(pin.date)}</span>
                <h2>{pin.placeName}</h2>
                <p>{pin.description}</p>
                <small>{pin.locationQuery || `${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}`}</small>
              </div>
            </article>
          ))}
        </section>
      </div>
    </PageScaffold>
  )
}

function NextVisitPage() {
  const [visit, setVisit, nextVisitState] = useNextVisitState(nextVisitPlan)
  const [now, setNow] = useState(() => new Date())
  const [detailsForm, setDetailsForm] = useState(() => ({
    title: visit.title,
    startDate: visit.startDate,
    endDate: visit.endDate,
    city: visit.city,
    arrivalTime: visit.arrivalTime,
    departureTime: visit.departureTime,
    travelNotes: visit.travelNotes,
  }))
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [itineraryForm, setItineraryForm] = useState(emptyItineraryForm)
  const [editingItineraryId, setEditingItineraryId] = useState(null)
  const [isItineraryFormOpen, setIsItineraryFormOpen] = useState(false)
  const [packingForm, setPackingForm] = useState(emptyQuickListForm)
  const [isPackingFormOpen, setIsPackingFormOpen] = useState(false)
  const [wishForm, setWishForm] = useState(emptyQuickListForm)
  const [isWishFormOpen, setIsWishFormOpen] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const visitStart = new Date(`${visit.startDate || new Date().toISOString().slice(0, 10)}T${visit.arrivalTime || '00:00'}`)
  const countdown = getTimeRemaining(visitStart, now)
  const itinerary = useMemo(
    () =>
      [...(visit.itinerary || [])].sort((a, b) => {
        const first = `${a.date}T${a.time || '00:00'}`
        const second = `${b.date}T${b.time || '00:00'}`
        return new Date(first).getTime() - new Date(second).getTime()
      }),
    [visit.itinerary],
  )

  const tripLength = visit.startDate && visit.endDate
    ? Math.max(1, Math.round((new Date(`${visit.endDate}T00:00:00`).getTime() - new Date(`${visit.startDate}T00:00:00`).getTime()) / 86400000) + 1)
    : 0

  function handleDetailsChange(event) {
    const { name, value } = event.target
    setDetailsForm((current) => ({ ...current, [name]: value }))
  }

  function openDetailsForm() {
    setDetailsForm({
      title: visit.title,
      startDate: visit.startDate,
      endDate: visit.endDate,
      city: visit.city,
      arrivalTime: visit.arrivalTime,
      departureTime: visit.departureTime,
      travelNotes: visit.travelNotes,
    })
    setIsDetailsOpen(true)
  }

  function handleDetailsSubmit(event) {
    event.preventDefault()
    setVisit((current) => ({
      ...current,
      ...detailsForm,
      title: detailsForm.title.trim(),
      city: detailsForm.city.trim(),
      travelNotes: detailsForm.travelNotes.trim(),
    }))
    setIsDetailsOpen(false)
  }

  function handleItineraryFieldChange(event) {
    const { name, value } = event.target
    setItineraryForm((current) => ({ ...current, [name]: value }))
  }

  function openItineraryForm() {
    setItineraryForm({ ...emptyItineraryForm, date: visit.startDate || '' })
    setEditingItineraryId(null)
    setIsItineraryFormOpen(true)
  }

  function resetItineraryForm() {
    setItineraryForm(emptyItineraryForm)
    setEditingItineraryId(null)
    setIsItineraryFormOpen(false)
  }

  function handleItinerarySubmit(event) {
    event.preventDefault()
    const cleanedItem = {
      ...itineraryForm,
      title: itineraryForm.title.trim(),
      location: itineraryForm.location.trim(),
      notes: itineraryForm.notes.trim(),
    }

    if (!cleanedItem.date || !cleanedItem.title) {
      return
    }

    setVisit((current) => ({
      ...current,
      itinerary: editingItineraryId
        ? current.itinerary.map((item) => (item.id === editingItineraryId ? { ...cleanedItem, id: editingItineraryId } : item))
        : [{ ...cleanedItem, id: crypto.randomUUID() }, ...(current.itinerary || [])],
    }))
    resetItineraryForm()
  }

  function startItineraryEdit(item) {
    setItineraryForm({
      date: item.date,
      time: item.time || '',
      title: item.title,
      location: item.location || '',
      notes: item.notes || '',
      category: item.category || 'other',
    })
    setEditingItineraryId(item.id)
    setIsItineraryFormOpen(true)
  }

  function deleteItineraryItem(itemId) {
    setVisit((current) => ({
      ...current,
      itinerary: current.itinerary.filter((item) => item.id !== itemId),
    }))
    if (editingItineraryId === itemId) {
      resetItineraryForm()
    }
  }

  function addQuickItem(event, listName, form, setForm, closeForm) {
    event.preventDefault()
    const label = form.label.trim()
    if (!label) return

    setVisit((current) => ({
      ...current,
      [listName]: [{ id: crypto.randomUUID(), label, text: label, done: false }, ...(current[listName] || [])],
    }))
    setForm(emptyQuickListForm)
    closeForm(false)
  }

  function toggleQuickItem(listName, itemId) {
    setVisit((current) => ({
      ...current,
      [listName]: current[listName].map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
    }))
  }

  function deleteQuickItem(listName, itemId) {
    setVisit((current) => ({
      ...current,
      [listName]: current[listName].filter((item) => item.id !== itemId),
    }))
  }

  return (
    <PageScaffold title="Next Visit Planner" subtitle="A shared place for the next Toronto to Calgary plan, from the countdown to the tiny reminders.">
      <DataStatus state={nextVisitState} count={visit ? 1 : 0} emptyMessage="No next visit is saved yet." />
      <div className="visit-layout">
        <section className="visit-hero-panel">
          <div className="visit-route" aria-hidden="true">
            <span><MapPinned size={15} /> {couple.homeBaseOne}</span>
            <div><Plane size={18} /></div>
            <span><MapPinned size={15} /> {couple.homeBaseTwo}</span>
          </div>
          <div>
            <p className="eyebrow">Next visit</p>
            <h2>{visit.title}</h2>
            <p>{visit.city} / {visit.startDate ? formatDate(visit.startDate) : 'Choose a date'}{visit.endDate ? ` to ${formatDate(visit.endDate)}` : ''}</p>
          </div>
          <div className="countdown-clock visit-countdown" aria-label="Countdown to next visit">
            <TimeBlock value={countdown.days} label="Days" />
            <TimeBlock value={countdown.hours} label="Hours" />
            <TimeBlock value={countdown.minutes} label="Minutes" />
            <TimeBlock value={countdown.seconds} label="Seconds" />
          </div>
        </section>

        <section className="visit-details-panel">
          <div className="album-toolbar">
            <div>
              <p className="eyebrow">Visit details</p>
              <h2>{tripLength ? `${tripLength} days together` : 'Dates not set'}</h2>
            </div>
            <button className="add-memory-button" type="button" onClick={openDetailsForm}>
              <Edit3 size={18} />
              <span>Edit details</span>
            </button>
          </div>

          <div className="visit-detail-grid">
            <VisitDetail label="City" value={visit.city || 'Not set'} />
            <VisitDetail label="Arrival" value={visit.arrivalTime || 'Not set'} />
            <VisitDetail label="Departure" value={visit.departureTime || 'Not set'} />
            <VisitDetail label="Travel notes" value={visit.travelNotes || 'Add flight, train, airport, or pickup details.'} wide />
          </div>

          {isDetailsOpen && (
            <form className="memory-form visit-form" onSubmit={handleDetailsSubmit}>
              <label>
                <span>Visit title</span>
                <input name="title" value={detailsForm.title} onChange={handleDetailsChange} placeholder="Our next visit" required />
              </label>
              <div className="form-row">
                <label>
                  <span>Start date</span>
                  <input name="startDate" type="date" value={detailsForm.startDate} onChange={handleDetailsChange} required />
                </label>
                <label>
                  <span>End date</span>
                  <input name="endDate" type="date" value={detailsForm.endDate} onChange={handleDetailsChange} required />
                </label>
              </div>
              <label>
                <span>City/location</span>
                <input name="city" value={detailsForm.city} onChange={handleDetailsChange} placeholder="Calgary, Toronto, or somewhere new" />
              </label>
              <div className="form-row">
                <label>
                  <span>Arrival time</span>
                  <input name="arrivalTime" type="time" value={detailsForm.arrivalTime} onChange={handleDetailsChange} />
                </label>
                <label>
                  <span>Departure time</span>
                  <input name="departureTime" type="time" value={detailsForm.departureTime} onChange={handleDetailsChange} />
                </label>
              </div>
              <label>
                <span>Flight/train/travel notes</span>
                <textarea name="travelNotes" value={detailsForm.travelNotes} onChange={handleDetailsChange} rows="3" placeholder="Flight number, airport pickup, train details, or reminders." />
              </label>
              <div className="form-actions">
                <button className="primary-action" type="submit">
                  <Save size={18} />
                  <span>Save details</span>
                </button>
                <button className="secondary-action" type="button" onClick={() => setIsDetailsOpen(false)}>
                  <X size={18} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="visit-itinerary-panel">
          <div className="album-toolbar">
            <div>
              <p className="eyebrow">Itinerary</p>
              <h2>{itinerary.length} plans</h2>
            </div>
            <button className="add-memory-button" type="button" onClick={openItineraryForm}>
              <Plus size={18} />
              <span>Add plan</span>
            </button>
          </div>

          {isItineraryFormOpen && (
            <form className="memory-form visit-form" onSubmit={handleItinerarySubmit}>
              <div className="form-row">
                <label>
                  <span>Date</span>
                  <input name="date" type="date" value={itineraryForm.date} onChange={handleItineraryFieldChange} required />
                </label>
                <label>
                  <span>Time</span>
                  <input name="time" type="time" value={itineraryForm.time} onChange={handleItineraryFieldChange} />
                </label>
              </div>
              <label>
                <span>Title</span>
                <input name="title" value={itineraryForm.title} onChange={handleItineraryFieldChange} placeholder="What are we doing?" required />
              </label>
              <div className="form-row">
                <label>
                  <span>Location</span>
                  <input name="location" value={itineraryForm.location} onChange={handleItineraryFieldChange} placeholder="Neighbourhood, restaurant, airport..." />
                </label>
                <label>
                  <span>Category</span>
                  <select name="category" value={itineraryForm.category} onChange={handleItineraryFieldChange}>
                    {visitCategories.map((category) => (
                      <option key={category} value={category}>{toTitleCase(category)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>Notes</span>
                <textarea name="notes" value={itineraryForm.notes} onChange={handleItineraryFieldChange} rows="3" placeholder="Reservation details, backup plan, or why this matters." />
              </label>
              <div className="form-actions">
                <button className="primary-action" type="submit">
                  <Save size={18} />
                  <span>{editingItineraryId ? 'Save plan' : 'Add plan'}</span>
                </button>
                <button className="secondary-action" type="button" onClick={resetItineraryForm}>
                  <X size={18} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          )}

          <div className="visit-itinerary-list">
            {itinerary.map((item) => (
              <article className="visit-plan-card" key={item.id}>
                <div className="visit-plan-date">
                  <strong>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${item.date}T00:00:00`))}</strong>
                  <span>{item.time || 'Any time'}</span>
                </div>
                <div>
                  <span>{toTitleCase(item.category)}</span>
                  <h2>{item.title}</h2>
                  {item.location && <small><MapPinned size={14} /> {item.location}</small>}
                  {item.notes && <p>{item.notes}</p>}
                </div>
                <div className="memory-actions bucket-actions">
                  <button type="button" onClick={() => startItineraryEdit(item)} aria-label={`Edit ${item.title}`}>
                    <Edit3 size={16} />
                    <span>Edit</span>
                  </button>
                  <button type="button" onClick={() => deleteItineraryItem(item.id)} aria-label={`Delete ${item.title}`}>
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="visit-side-panel">
          <VisitChecklist
            title="Packing and reminders"
            eyebrow="Before the airport"
            items={visit.packing || []}
            form={packingForm}
            isOpen={isPackingFormOpen}
            onOpen={() => setIsPackingFormOpen(true)}
            onCancel={() => {
              setPackingForm(emptyQuickListForm)
              setIsPackingFormOpen(false)
            }}
            onChange={(event) => setPackingForm({ label: event.target.value })}
            onSubmit={(event) => addQuickItem(event, 'packing', packingForm, setPackingForm, setIsPackingFormOpen)}
            onToggle={(itemId) => toggleQuickItem('packing', itemId)}
            onDelete={(itemId) => deleteQuickItem('packing', itemId)}
            placeholder="Add passport, charger, gift..."
            buttonLabel="Add reminder"
          />

          <VisitChecklist
            title="Things we want to do"
            eyebrow="Tiny shared list"
            items={visit.wishList || []}
            form={wishForm}
            isOpen={isWishFormOpen}
            onOpen={() => setIsWishFormOpen(true)}
            onCancel={() => {
              setWishForm(emptyQuickListForm)
              setIsWishFormOpen(false)
            }}
            onChange={(event) => setWishForm({ label: event.target.value })}
            onSubmit={(event) => addQuickItem(event, 'wishList', wishForm, setWishForm, setIsWishFormOpen)}
            onToggle={(itemId) => toggleQuickItem('wishList', itemId)}
            onDelete={(itemId) => deleteQuickItem('wishList', itemId)}
            placeholder="Add something small for us..."
            buttonLabel="Add idea"
          />
        </section>
      </div>
    </PageScaffold>
  )
}

function TwoCityWeatherPage() {
  const [weather, setWeather] = useState(mockWeather)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadWeather() {
      setStatus('loading')
      setErrorMessage('')

      try {
        const responses = await Promise.all(
          weatherCities.map(async (city) => {
            const response = await fetch(buildWeatherUrl(city))
            if (!response.ok) {
              throw new Error(`Weather request failed for ${city.name}`)
            }
            return normalizeWeather(city, await response.json())
          }),
        )

        if (isMounted) {
          setWeather(responses)
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setWeather(mockWeather)
          setStatus('error')
          setErrorMessage('Live weather is unavailable right now, so this is showing sample weather.')
        }
      }
    }

    loadWeather()

    return () => {
      isMounted = false
    }
  }, [])

  const comparisonMessage = status === 'loading' ? 'Checking the same sky over both cities...' : getWeatherComparison(weather)

  return (
    <PageScaffold title="Two-City Weather" subtitle="Same sky, two cities, and one little check-in between Toronto and Calgary.">
      <div className="weather-layout">
        <section className="weather-hero-panel">
          <div>
            <p className="eyebrow">Toronto ↔ Calgary</p>
            <h2>same sky, two cities</h2>
            <p>{comparisonMessage}</p>
          </div>
          <div className="weather-route" aria-hidden="true">
            <span><MapPinned size={15} /> Toronto</span>
            <div><Plane size={18} /></div>
            <span><MapPinned size={15} /> Calgary</span>
          </div>
        </section>

        {errorMessage && <p className="weather-status-message">{errorMessage}</p>}

        <div className="weather-card-grid" aria-live="polite">
          {weather.map((cityWeather) => (
            <WeatherCityCard key={cityWeather.id} weather={cityWeather} loading={status === 'loading'} />
          ))}
        </div>

        <section className="weather-note-card">
          <span className="icon-pill"><CloudSun size={18} /></span>
          <div>
            <p className="eyebrow">Live weather layer</p>
            <h2>No API key needed for now</h2>
            <p>
              This page currently uses Open-Meteo directly in the browser. If you later want a server function,
              API key, or Supabase-backed weather snapshots, replace `buildWeatherUrl` and `normalizeWeather`.
            </p>
          </div>
        </section>
      </div>
    </PageScaffold>
  )
}

function WeatherCityCard({ weather, loading }) {
  const codeInfo = getWeatherCodeInfo(weather.code)

  return (
    <article className={`weather-city-card weather-${codeInfo.type}`}>
      <div className="weather-card-topline">
        <div>
          <p className="eyebrow">{weather.source === 'live' ? 'Live now' : 'Sample data'}</p>
          <h2>{weather.city}</h2>
        </div>
        <WeatherIcon type={codeInfo.type} />
      </div>

      <div className={loading ? 'weather-temp loading' : 'weather-temp'}>
        <strong>{loading ? '--\u00b0' : formatTemperature(weather.temperature)}</strong>
        <span>{loading ? 'Loading' : weather.condition}</span>
      </div>

      <div className="weather-meta-grid">
        <div>
          <span>High / Low</span>
          <strong>{loading ? '-- / --' : `${formatTemperature(weather.high)} / ${formatTemperature(weather.low)}`}</strong>
        </div>
        <div>
          <span>Feels like</span>
          <strong>{loading ? '--' : formatTemperature(weather.feelsLike)}</strong>
        </div>
      </div>
    </article>
  )
}

function WeatherIcon({ type }) {
  if (type === 'clear') return <Sun size={30} />
  if (type === 'rain') return <CloudRain size={30} />
  if (type === 'snow') return <Snowflake size={30} />
  if (type === 'cloudy') return <Cloud size={30} />
  return <CloudSun size={30} />
}

function DailyThreePage() {
  const today = new Date().toISOString().slice(0, 10)
  const people = [couple.personOne, couple.personTwo]
  const [entries, setEntries, dailyThreeState] = useSupabaseList(
    'daily_three_entries',
    dailyThreeEntries,
    rowMappers.dailyThree.from,
    rowMappers.dailyThree.to,
    { orderBy: 'entry_date' },
  )
  const [form, setForm] = useState({ ...emptyDailyThreeForm, date: today })
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const todayEntries = people.map((person) => entries.find((entry) => entry.date === today && entry.author === person)).filter(Boolean)
  const missingToday = people.filter((person) => !entries.some((entry) => entry.date === today && entry.author === person))
  const completedTogetherCount = new Set(
    entries
      .map((entry) => entry.date)
      .filter((date) => people.every((person) => entries.some((entry) => entry.date === date && entry.author === person))),
  ).size
  const totalItems = entries.reduce((total, entry) => total + entry.items.filter(Boolean).length, 0)
  const groupedHistory = useMemo(() => {
    const groups = entries
      .filter((entry) => entry.date !== today)
      .reduce((accumulator, entry) => {
        accumulator[entry.date] = accumulator[entry.date] || []
        accumulator[entry.date].push(entry)
        return accumulator
      }, {})

    return Object.entries(groups)
      .sort(([firstDate], [secondDate]) => new Date(`${secondDate}T00:00:00`) - new Date(`${firstDate}T00:00:00`))
      .map(([date, dateEntries]) => ({
        date,
        entries: dateEntries.sort((a, b) => people.indexOf(a.author) - people.indexOf(b.author)),
      }))
  }, [entries, people, today])

  function handleDailyFieldChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function openDailyForm(author = couple.personOne) {
    const existingEntry = entries.find((entry) => entry.date === today && entry.author === author)

    if (existingEntry) {
      startDailyEdit(existingEntry)
      return
    }

    setForm({ ...emptyDailyThreeForm, date: today, author })
    setEditingId(null)
    setIsFormOpen(true)
  }

  function resetDailyForm() {
    setForm({ ...emptyDailyThreeForm, date: today })
    setEditingId(null)
    setIsFormOpen(false)
  }

  function handleDailySubmit(event) {
    event.preventDefault()
    const cleanedEntry = {
      date: form.date,
      author: form.author,
      items: [form.itemOne.trim(), form.itemTwo.trim(), form.itemThree.trim()],
      note: form.note.trim(),
    }

    if (!cleanedEntry.date || !cleanedEntry.author || cleanedEntry.items.some((item) => !item)) {
      return
    }

    if (editingId) {
      setEntries((current) => current.map((entry) => (entry.id === editingId ? { ...cleanedEntry, id: editingId } : entry)))
    } else {
      setEntries((current) => [{ ...cleanedEntry, id: crypto.randomUUID() }, ...current])
    }

    resetDailyForm()
  }

  function startDailyEdit(entry) {
    setEditingId(entry.id)
    setForm({
      date: entry.date,
      author: entry.author,
      itemOne: entry.items[0] || '',
      itemTwo: entry.items[1] || '',
      itemThree: entry.items[2] || '',
      note: entry.note || '',
    })
    setIsFormOpen(true)
  }

  function deleteDailyEntry(entryId) {
    setEntries((current) => current.filter((entry) => entry.id !== entryId))
    if (editingId === entryId) {
      resetDailyForm()
    }
  }

  return (
    <PageScaffold title="Daily 3 List" subtitle="A quiet gratitude journal for three small things each, one day at a time.">
      <DataStatus state={dailyThreeState} count={entries.length} emptyMessage="No Daily 3 entries yet. Add today’s first three." />
      <div className="daily-layout">
        <section className="daily-hero-panel">
          <div>
            <p className="eyebrow">Today / {formatDate(today)}</p>
            <h2>three little thank-yous</h2>
            <p>Not a tracker. Just a soft place to notice what carried us through the day.</p>
          </div>
          <div className="daily-stats-grid">
            <div>
              <strong>{completedTogetherCount}</strong>
              <span>Days completed together</span>
            </div>
            <div>
              <strong>{totalItems}</strong>
              <span>Gratitude items saved</span>
            </div>
          </div>
        </section>

        <section className="daily-today-panel">
          <div className="album-toolbar">
            <div>
              <p className="eyebrow">Today’s entries</p>
              <h2>{todayEntries.length} of {people.length} submitted</h2>
            </div>
            <button className="add-memory-button" type="button" onClick={() => openDailyForm(missingToday[0] || couple.personOne)}>
              <Plus size={18} />
              <span>Add today</span>
            </button>
          </div>

          {isFormOpen && (
            <DailyThreeForm
              form={form}
              editingId={editingId}
              people={people}
              onChange={handleDailyFieldChange}
              onSubmit={handleDailySubmit}
              onCancel={resetDailyForm}
            />
          )}

          <div className="daily-card-grid">
            {people.map((person) => {
              const entry = entries.find((dailyEntry) => dailyEntry.date === today && dailyEntry.author === person)

              return entry ? (
                <DailyEntryCard key={entry.id} entry={entry} canEdit onEdit={() => startDailyEdit(entry)} onDelete={() => deleteDailyEntry(entry.id)} />
              ) : (
                <article className="daily-empty-card" key={person}>
                  <span className="icon-pill"><Feather size={18} /></span>
                  <div>
                    <p className="eyebrow">{person}</p>
                    <h2>Waiting softly</h2>
                    <p>{person} has not added today’s three yet. There is still room for the day to become words.</p>
                    <button className="secondary-action" type="button" onClick={() => openDailyForm(person)}>
                      <Plus size={18} />
                      <span>Add for {person}</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="daily-history-panel">
          <div className="section-heading">
            <span className="icon-pill"><CalendarHeart size={18} /></span>
            <div>
              <p className="eyebrow">History</p>
              <h2>{groupedHistory.length} saved days</h2>
            </div>
          </div>

          <div className="daily-history-list">
            {groupedHistory.map((group) => (
              <article className="daily-history-group" key={group.date}>
                <div className="daily-history-date">
                  <strong>{formatDate(group.date)}</strong>
                  <span>{group.entries.length === people.length ? 'Both wrote' : 'One entry saved'}</span>
                </div>
                <div className="daily-card-grid">
                  {group.entries.map((entry) => (
                    <DailyEntryCard key={entry.id} entry={entry} onDelete={() => deleteDailyEntry(entry.id)} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageScaffold>
  )
}

function DailyThreeForm({ form, editingId, people, onChange, onSubmit, onCancel }) {
  return (
    <form className="memory-form daily-form" onSubmit={onSubmit}>
      <div className="form-row">
        <label>
          <span>Date</span>
          <input name="date" type="date" value={form.date} onChange={onChange} required />
        </label>
        <label>
          <span>Person</span>
          <select name="author" value={form.author} onChange={onChange}>
            {people.map((person) => (
              <option key={person} value={person}>{person}</option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span>Gratitude item 1</span>
        <input name="itemOne" value={form.itemOne} onChange={onChange} placeholder="Something small that mattered" required />
      </label>
      <label>
        <span>Gratitude item 2</span>
        <input name="itemTwo" value={form.itemTwo} onChange={onChange} placeholder="A person, moment, or feeling" required />
      </label>
      <label>
        <span>Gratitude item 3</span>
        <input name="itemThree" value={form.itemThree} onChange={onChange} placeholder="One more thing worth noticing" required />
      </label>
      <label>
        <span>Optional note</span>
        <textarea name="note" value={form.note} onChange={onChange} rows="3" placeholder="A tiny summary of the day, if you want." />
      </label>

      <div className="form-actions">
        <button className="primary-action" type="submit">
          <Save size={18} />
          <span>{editingId ? 'Save entry' : 'Add Daily 3'}</span>
        </button>
        <button className="secondary-action" type="button" onClick={onCancel}>
          <X size={18} />
          <span>Cancel</span>
        </button>
      </div>
    </form>
  )
}

function DailyEntryCard({ entry, canEdit = false, onEdit, onDelete }) {
  return (
    <article className="daily-entry-card">
      <div>
        <p className="eyebrow">{entry.author}</p>
        <h2>{formatDate(entry.date)}</h2>
      </div>
      <ol>
        {entry.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      {entry.note && <p>{entry.note}</p>}
      <div className="memory-actions bucket-actions">
        {canEdit && (
          <button type="button" onClick={onEdit} aria-label={`Edit ${entry.author}'s Daily 3`}>
            <Edit3 size={16} />
            <span>Edit</span>
          </button>
        )}
        <button type="button" onClick={onDelete} aria-label={`Delete ${entry.author}'s Daily 3`}>
          <Trash2 size={16} />
          <span>Delete</span>
        </button>
      </div>
    </article>
  )
}

function VisitDetail({ label, value, wide = false }) {
  return (
    <div className={wide ? 'visit-detail-card wide' : 'visit-detail-card'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function VisitChecklist({ title, eyebrow, items, form, isOpen, onOpen, onCancel, onChange, onSubmit, onToggle, onDelete, placeholder, buttonLabel }) {
  return (
    <div className="visit-checklist-card">
      <div className="album-toolbar">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <button className="add-memory-button compact" type="button" onClick={onOpen}>
          <Plus size={17} />
          <span>{buttonLabel}</span>
        </button>
      </div>

      {isOpen && (
        <form className="quick-add-form" onSubmit={onSubmit}>
          <input value={form.label} onChange={onChange} placeholder={placeholder} required />
          <div className="form-actions">
            <button className="primary-action" type="submit">
              <Save size={17} />
              <span>Save</span>
            </button>
            <button className="secondary-action" type="button" onClick={onCancel}>
              <X size={17} />
              <span>Cancel</span>
            </button>
          </div>
        </form>
      )}

      <div className="visit-check-list">
        {items.map((item) => (
          <article className={item.done ? 'visit-check-item complete' : 'visit-check-item'} key={item.id}>
            <button type="button" onClick={() => onToggle(item.id)} aria-label={`Toggle ${item.label || item.text}`}>
              <CheckCircle2 size={19} />
            </button>
            <span>{item.label || item.text}</span>
            <button type="button" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.label || item.text}`}>
              <Trash2 size={15} />
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}

function BucketListPage() {
  const [items, setItems, bucketState] = useSupabaseList(
    'bucket_list_items',
    bucketList,
    rowMappers.bucket.from,
    rowMappers.bucket.to,
    { orderBy: 'created_at' },
  )
  const [form, setForm] = useState(emptyBucketForm)
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')

  const completedItems = items.filter((item) => item.status === 'completed')
  const progress = items.length ? Math.round((completedItems.length / items.length) * 100) : 0
  const visibleItems = useMemo(
    () =>
      [...items]
        .filter((item) => activeCategory === 'all' || item.category === activeCategory)
        .sort((a, b) => bucketStatuses.indexOf(a.status) - bucketStatuses.indexOf(b.status)),
    [activeCategory, items],
  )

  function handleBucketFieldChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function openBucketForm() {
    setForm(emptyBucketForm)
    setEditingId(null)
    setIsFormOpen(true)
  }

  function resetBucketForm() {
    setForm(emptyBucketForm)
    setEditingId(null)
    setIsFormOpen(false)
  }

  function handleBucketSubmit(event) {
    event.preventDefault()

    const cleanedItem = {
      ...form,
      title: form.title.trim(),
      notes: form.notes.trim(),
      memoryPhoto: form.memoryPhoto.trim(),
      memoryCaption: form.memoryCaption.trim(),
    }

    if (!cleanedItem.title) {
      return
    }

    if (editingId) {
      setItems((current) => current.map((item) => (item.id === editingId ? { ...cleanedItem, id: editingId } : item)))
    } else {
      setItems((current) => [{ ...cleanedItem, id: crypto.randomUUID() }, ...current])
    }

    resetBucketForm()
  }

  function startBucketEdit(item) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      status: item.status,
      notes: item.notes || '',
      targetDate: item.targetDate || '',
      category: item.category,
      memoryPhoto: item.memoryPhoto || '',
      memoryCaption: item.memoryCaption || '',
    })
    setIsFormOpen(true)
  }

  function deleteBucketItem(itemId) {
    setItems((current) => current.filter((item) => item.id !== itemId))
    if (editingId === itemId) {
      resetBucketForm()
    }
  }

  function toggleCompleted(itemId) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: item.status === 'completed' ? 'want to do' : 'completed',
            }
          : item,
      ),
    )
  }

  return (
    <PageScaffold title="Shared Bucket List" subtitle="The big plans, tiny traditions, and trips worth keeping in view.">
      <DataStatus state={bucketState} count={items.length} emptyMessage="No bucket list items yet. Add the first plan." />
      <div className="bucket-layout">
        <section className="bucket-progress-panel">
          <div>
            <p className="eyebrow">Shared progress</p>
            <h2>{progress}% complete</h2>
            <p>{completedItems.length} of {items.length} plans have become memories.</p>
          </div>
          <div className="progress-track bucket-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <button className="add-memory-button" type="button" onClick={openBucketForm}>
            <Plus size={18} />
            <span>Add item</span>
          </button>
        </section>

        {isFormOpen && (
          <section className="bucket-form-panel" aria-labelledby="bucket-form-title">
            <div className="section-heading">
              <span className="icon-pill"><CheckCircle2 size={18} /></span>
              <div>
                <p className="eyebrow">{editingId ? 'Editing plan' : 'New plan'}</p>
                <h2 id="bucket-form-title">{editingId ? 'Update bucket item' : 'Add bucket item'}</h2>
              </div>
            </div>

            <form className="memory-form bucket-form" onSubmit={handleBucketSubmit}>
              <label>
                <span>Title</span>
                <input name="title" value={form.title} onChange={handleBucketFieldChange} placeholder="What should we do?" required />
              </label>

              <div className="form-row">
                <label>
                  <span>Category</span>
                  <select name="category" value={form.category} onChange={handleBucketFieldChange}>
                    {bucketCategories.map((category) => (
                      <option key={category} value={category}>{toTitleCase(category)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select name="status" value={form.status} onChange={handleBucketFieldChange}>
                    {bucketStatuses.map((status) => (
                      <option key={status} value={status}>{toTitleCase(status)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <span>Optional target date</span>
                <input name="targetDate" type="date" value={form.targetDate} onChange={handleBucketFieldChange} />
              </label>

              <label>
                <span>Notes</span>
                <textarea name="notes" value={form.notes} onChange={handleBucketFieldChange} rows="3" placeholder="Why this matters, what to remember, or how to plan it." />
              </label>

              {form.status === 'completed' && (
                <>
                  <label>
                    <span>Completed memory photo URL</span>
                    <input name="memoryPhoto" value={form.memoryPhoto} onChange={handleBucketFieldChange} placeholder="https://..." />
                  </label>
                  <label>
                    <span>Completed memory caption</span>
                    <input name="memoryCaption" value={form.memoryCaption} onChange={handleBucketFieldChange} placeholder="What made it worth saving?" />
                  </label>
                </>
              )}

              <div className="form-actions">
                <button className="primary-action" type="submit">
                  <Save size={18} />
                  <span>{editingId ? 'Save item' : 'Add item'}</span>
                </button>
                <button className="secondary-action" type="button" onClick={resetBucketForm}>
                  <X size={18} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="bucket-list-panel">
          <div className="album-toolbar">
            <div>
              <p className="eyebrow">Plans</p>
              <h2>{visibleItems.length} bucket items</h2>
            </div>
            <div className="category-filters" aria-label="Filter bucket list by category">
              {['all', ...bucketCategories].map((category) => (
                <button
                  className={activeCategory === category ? 'filter-chip active' : 'filter-chip'}
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory((current) => toggleFilterValue(current, category))}
                >
                  {toTitleCase(category)}
                </button>
              ))}
            </div>
          </div>

          <div className="bucket-list">
            {visibleItems.map((item) => (
              <article className={`bucket-card status-${item.status.replaceAll(' ', '-')}`} key={item.id}>
                <div className="bucket-card-main">
                  <button
                    className={item.status === 'completed' ? 'bucket-check complete' : 'bucket-check'}
                    type="button"
                    onClick={() => toggleCompleted(item.id)}
                    aria-label={item.status === 'completed' ? `Mark ${item.title} not completed` : `Mark ${item.title} completed`}
                  >
                    <CheckCircle2 size={20} />
                  </button>
                  <div>
                    <span>{toTitleCase(item.category)} / {toTitleCase(item.status)}</span>
                    <h2>{item.title}</h2>
                    {item.notes && <p>{item.notes}</p>}
                    {item.targetDate && <small>Target: {formatDate(item.targetDate)}</small>}
                  </div>
                </div>
                <div className="memory-actions bucket-actions">
                  <button type="button" onClick={() => startBucketEdit(item)} aria-label={`Edit ${item.title}`}>
                    <Edit3 size={16} />
                    <span>Edit</span>
                  </button>
                  <button type="button" onClick={() => deleteBucketItem(item.id)} aria-label={`Delete ${item.title}`}>
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="completed-memories-panel">
          <div className="section-heading">
            <span className="icon-pill"><Sparkles size={18} /></span>
            <div>
              <p className="eyebrow">Completed memories</p>
              <h2>{completedItems.length} saved wins</h2>
            </div>
          </div>
          <div className="completed-memory-grid">
            {completedItems.map((item) => (
              <article className="completed-memory-card" key={item.id}>
                {item.memoryPhoto ? (
                  <img src={item.memoryPhoto} alt="" />
                ) : (
                  <div className="completed-memory-placeholder"><CheckCircle2 size={26} /></div>
                )}
                <div>
                  <span>{toTitleCase(item.category)}</span>
                  <h2>{item.title}</h2>
                  <p>{item.memoryCaption || item.notes || 'Completed together and worth remembering.'}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageScaffold>
  )
}

function PageScaffold({ title, subtitle, children }) {
  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Private space</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

export default App
