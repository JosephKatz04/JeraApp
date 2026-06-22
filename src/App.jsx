import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  CalendarHeart,
  Camera,
  CheckCircle2,
  Clock3,
  Edit3,
  Heart,
  Home,
  ImagePlus,
  LockKeyhole,
  MapPinned,
  MessageCircleHeart,
  Plane,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { albumPhotos, bucketList, countdownEvents, couple, dateNightIdeas, importantDates, memories, memoryMapPins, notes } from './data'

const MEMORY_STORAGE_KEY = 'our-little-map.memories'
const NOTE_STORAGE_KEY = 'our-little-map.notes'
const TRIP_STORAGE_KEY = 'our-little-map.trips'
const ALBUM_STORAGE_KEY = 'our-little-map.album'
const DATE_NIGHT_STORAGE_KEY = 'our-little-map.dateNight'
const MAP_STORAGE_KEY = 'our-little-map.mapPins'
const BUCKET_STORAGE_KEY = 'our-little-map.bucketList'

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

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/timeline', label: 'Timeline', icon: CalendarHeart },
  { to: '/notes', label: 'Notes', icon: MessageCircleHeart },
  { to: '/countdowns', label: 'Dates', icon: Clock3 },
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

function App() {
  return (
    <div className="app-shell">
      <BackgroundAccents />
      <aside className="desktop-nav" aria-label="Primary navigation">
        <Brand />
        <nav>
          {navItems.map((item) => (
            <NavigationLink key={item.to} item={item} />
          ))}
        </nav>
      </aside>

      <div className="app-frame">
        <header className="topbar">
          <Brand compact />
          <nav className="top-nav" aria-label="Primary navigation">
            {navItems.slice(0, 4).map((item) => (
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
            <Route path="/album" element={<AlbumPage />} />
            <Route path="/date-night" element={<DateNightPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/bucket-list" element={<BucketListPage />} />
          </Routes>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavigationLink key={item.to} item={item} mobile />
        ))}
      </nav>
    </div>
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
        <strong>Our Little Map</strong>
        {!compact && <span>{couple.homeBaseOne} to {couple.homeBaseTwo}</span>}
      </div>
    </div>
  )
}

function NavigationLink({ item, mobile = false }) {
  const Icon = item.icon

  return (
    <NavLink to={item.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} end={item.to === '/'}>
      <Icon size={mobile ? 19 : 18} aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  )
}

function HomeDashboard() {
  const latestMemory = memories[0]
  const latestNote = notes[0]
  const nextAnniversaryDate = getNextEventDate({ date: importantDates.anniversary, repeats: 'yearly' })
  const anniversaryDays = getTimeRemaining(nextAnniversaryDate).days
  const completeCount = bucketList.filter((item) => item.status === 'completed').length
  const progress = Math.round((completeCount / bucketList.length) * 100)

  return (
    <section className="page home-page">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">{couple.homeBaseOne} / {couple.homeBaseTwo}</p>
          <h1>{couple.personOne} & {couple.personTwo}</h1>
          <p className="hero-copy">
            A quiet place for the memories, plans, and small signals that keep us close between flights.
          </p>
        </div>
        <div className="anniversary-card">
          <span>Anniversary</span>
          <strong>{anniversaryDays}</strong>
          <p>days until {formatCountdownDate(nextAnniversaryDate)}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <FeatureCard eyebrow="Latest memory" title={latestMemory.title} icon={CalendarHeart}>
          <p>{latestMemory.description}</p>
          <small><MapPinned size={14} /> {latestMemory.location} / {formatDate(latestMemory.date)}</small>
        </FeatureCard>

        <FeatureCard eyebrow="Latest note" title={`From ${latestNote.author}`} icon={MessageCircleHeart}>
          <p>{latestNote.message}</p>
          <small>{formatDateTime(latestNote.dateTime)}</small>
        </FeatureCard>

        <FeatureCard eyebrow="Shared bucket list" title={`${progress}% complete`} icon={CheckCircle2}>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>{completeCount} of {bucketList.length} little plans already done.</p>
        </FeatureCard>
      </div>
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

function TimelinePage() {
  const [storedMemories, setStoredMemories] = useState(() => {
    try {
      const saved = window.localStorage.getItem(MEMORY_STORAGE_KEY)
      return saved ? JSON.parse(saved) : memories
    } catch {
      return memories
    }
  })
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
    window.localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(storedMemories))
  }, [storedMemories])

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
                  onClick={() => setActiveCategory(category)}
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

function NotesPage() {
  const [storedNotes, setStoredNotes] = useState(() => {
    try {
      const saved = window.localStorage.getItem(NOTE_STORAGE_KEY)
      const initialNotes = saved ? JSON.parse(saved) : notes
      return initialNotes.map((note) => ({
        ...note,
        author: note.author === 'Her' ? couple.personTwo : note.author,
      }))
    } catch {
      return notes
    }
  })
  const [noteForm, setNoteForm] = useState(emptyNoteForm)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [isNoteFormOpen, setIsNoteFormOpen] = useState(false)
  const [highlightedNoteId, setHighlightedNoteId] = useState(null)
  const [deletingNoteIds, setDeletingNoteIds] = useState([])
  const noteHighlightTimeoutRef = useRef(null)

  useEffect(() => {
    window.localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(storedNotes))
  }, [storedNotes])

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
  const [trips, setTrips] = useState(() => {
    try {
      const saved = window.localStorage.getItem(TRIP_STORAGE_KEY)
      return saved ? JSON.parse(saved) : getConfiguredTrips(countdownEvents)
    } catch {
      return getConfiguredTrips(countdownEvents)
    }
  })
  const [editingTripId, setEditingTripId] = useState(null)
  const [tripDateDraft, setTripDateDraft] = useState('')

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(trips))
  }, [trips])

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
  const [photos, setPhotos] = useState(() => {
    try {
      const saved = window.localStorage.getItem(ALBUM_STORAGE_KEY)
      return saved ? JSON.parse(saved) : albumPhotos
    } catch {
      return albumPhotos
    }
  })
  const [photoForm, setPhotoForm] = useState(emptyPhotoForm)
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  useEffect(() => {
    window.localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(photos))
  }, [photos])

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

  function handlePhotoFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setPhotoForm((current) => ({ ...current, image: reader.result }))
    }
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
  }

  return (
    <PageScaffold title="Photo Album" subtitle="A private gallery for trips, calls, tiny rituals, and proof that the distance is real but not everything.">
      <div className="album-layout">
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

            <button className="primary-action" type="submit">
              <Save size={18} />
              <span>Add photo</span>
            </button>
          </form>
        </section>

        <section className="album-gallery" aria-label="Photo gallery">
          <div className="album-toolbar">
            <div>
              <p className="eyebrow">Gallery</p>
              <h2>{filteredPhotos.length} photos</h2>
            </div>
            <div className="category-filters" aria-label="Filter photos by category">
              {['all', ...albumCategories].map((category) => (
                <button
                  className={activeCategory === category ? 'filter-chip active' : 'filter-chip'}
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
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

  return <img src={photo.image} alt="" loading="lazy" />
}

function DateNightPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedIdea, setSelectedIdea] = useState(() => dateNightIdeas[0])
  const [spinKey, setSpinKey] = useState(0)
  const [savedState, setSavedState] = useState(() => {
    try {
      const saved = window.localStorage.getItem(DATE_NIGHT_STORAGE_KEY)
      return saved ? JSON.parse(saved) : { favorites: [], completed: [] }
    } catch {
      return { favorites: [], completed: [] }
    }
  })

  useEffect(() => {
    window.localStorage.setItem(DATE_NIGHT_STORAGE_KEY, JSON.stringify(savedState))
  }, [savedState])

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
                onClick={() => setActiveCategory(category)}
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
  const [pins, setPins] = useState(() => {
    try {
      const saved = window.localStorage.getItem(MAP_STORAGE_KEY)
      return saved ? JSON.parse(saved) : memoryMapPins
    } catch {
      return memoryMapPins
    }
  })
  const [pinForm, setPinForm] = useState(emptyMapPinForm)
  const [activeType, setActiveType] = useState('all')
  const [mapFormError, setMapFormError] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isMapFormOpen, setIsMapFormOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(pins))
  }, [pins])

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
                  onClick={() => setActiveType(type)}
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

function BucketListPage() {
  const [items, setItems] = useState(() => {
    try {
      const saved = window.localStorage.getItem(BUCKET_STORAGE_KEY)
      return saved ? JSON.parse(saved) : bucketList
    } catch {
      return bucketList
    }
  })
  const [form, setForm] = useState(emptyBucketForm)
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    window.localStorage.setItem(BUCKET_STORAGE_KEY, JSON.stringify(items))
  }, [items])

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
                  onClick={() => setActiveCategory(category)}
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
