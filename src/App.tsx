import { useEffect, useState } from 'react'
import './App.css'

type Split = 'Push' | 'Pull' | 'Legs'

type WorkoutSet = {
  id: string
  weight: string
  reps: string
  done: boolean
}

type WorkoutExercise = {
  id: string
  name: string
  sets: WorkoutSet[]
}

type Workout = {
  id: string
  name: string
  split: Split
  date: string
  exercises: WorkoutExercise[]
  createdAt: string
}

type ExerciseTemplate = {
  name: string
}

type SplitTemplate = {
  split: Split
  exercises: ExerciseTemplate[]
}

const STORAGE_KEYS = {
  templates: 'gymapp.templates',
  workouts: 'gymapp.workouts',
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function createSet(weight: string, reps: string): WorkoutSet {
  return { id: createId(), weight, reps, done: false }
}

function createExercise(name: string): WorkoutExercise {
  return { id: createId(), name, sets: [createSet('', '8')] }
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const defaultTemplates: SplitTemplate[] = [
  { split: 'Push', exercises: [] },
  { split: 'Pull', exercises: [] },
  { split: 'Legs', exercises: [] },
]

async function loadTemplatesFromServer(): Promise<SplitTemplate[]> {
  try {
    const baseUrl = window.location.pathname.replace(/\/$/, '')
    const response = await fetch(baseUrl + '/templates.json', { cache: 'no-store' })
    if (!response.ok) {
      console.error('Failed to fetch templates:', response.status, response.statusText)
      return defaultTemplates
    }
    const data = await response.json()
    return [
      { split: 'Push', exercises: (data.Push || []).map((name: string) => ({ name })) },
      { split: 'Pull', exercises: (data.Pull || []).map((name: string) => ({ name })) },
      { split: 'Legs', exercises: (data.Legs || []).map((name: string) => ({ name })) },
    ]
  } catch (err) {
    console.error('Error loading templates:', err)
    return defaultTemplates
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function getBestSet(sets: WorkoutSet[]) {
  return [...sets]
    .filter((s) => s.done && s.weight && s.reps)
    .sort((a, b) => {
      const aVal = Number(a.weight) * Number(a.reps)
      const bVal = Number(b.weight) * Number(b.reps)
      return bVal - aVal
    })[0] ?? null
}

function getExercisePR(exerciseName: string, allWorkouts: Workout[]): { weight: string; reps: string } | null {
  const target = normalizeName(exerciseName)
  let bestPR: { weight: string; reps: string; value: number } | null = null

  for (const workout of allWorkouts) {
    for (const exercise of workout.exercises) {
      if (normalizeName(exercise.name) !== target) continue
      const best = getBestSet(exercise.sets)
      if (!best) continue
      const value = Number(best.weight) * Number(best.reps)
      if (!bestPR || value > bestPR.value) {
        bestPR = { weight: best.weight, reps: best.reps, value }
      }
    }
  }

  return bestPR ? { weight: bestPR.weight, reps: bestPR.reps } : null
}

function getAllExerciseStats(allWorkouts: Workout[]) {
  const stats: Record<string, { weight: string; reps: string; value: number }> = {}

  for (const workout of allWorkouts) {
    for (const exercise of workout.exercises) {
      const name = normalizeName(exercise.name)
      const best = getBestSet(exercise.sets)
      if (!best) continue
      const value = Number(best.weight) * Number(best.reps)
      if (!stats[name] || value > stats[name].value) {
        stats[name] = { weight: best.weight, reps: best.reps, value }
      }
    }
  }

  return stats
}

function App() {
  const [screen, setScreen] = useState<'home' | 'workout' | 'edit-templates'>('home')
  const [selectedSplit, setSelectedSplit] = useState<Split | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutExercise[]>([])
  const [templates, setTemplates] = useState<SplitTemplate[]>(defaultTemplates)
  const [workouts, setWorkouts] = useState<Workout[]>(() => 
    readStorage(STORAGE_KEYS.workouts, [])
  )
  const [showHistory, setShowHistory] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Workout | null>(null)

  function deleteWorkout(id: string) {
    setWorkouts((prev) => prev.filter((w) => w.id !== id))
    setDeleteConfirm(null)
  }

  async function syncFromServer() {
    setStatusMessage('Refreshing...')
    const serverTemplates = await loadTemplatesFromServer()
    setTemplates(serverTemplates)
    window.localStorage.removeItem(STORAGE_KEYS.templates)
    setStatusMessage(`Loaded ${serverTemplates.reduce((sum, t) => sum + t.exercises.length, 0)} exercises`)
    setTimeout(() => setStatusMessage(''), 2000)
  }

  useEffect(() => {
    loadTemplatesFromServer().then((serverTemplates) => {
      const saved = readStorage<SplitTemplate[] | null>(STORAGE_KEYS.templates, null)
      if (saved && saved.some(t => t.exercises.length > 0)) {
        setTemplates(saved)
      } else {
        setTemplates(serverTemplates)
      }
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    window.localStorage.setItem(STORAGE_KEYS.templates, JSON.stringify(templates))
  }, [templates, loaded])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(workouts))
  }, [workouts])

  function startWorkout(split: Split) {
    const template = templates.find((t) => t.split === split)
    const exercises = template?.exercises.map((ex) =>
      createExercise(ex.name),
    ) ?? []
    setCurrentWorkout(exercises)
    setSelectedSplit(split)
    setCurrentExerciseIndex(0)
    setScreen('workout')
  }

  function finishExercise() {
    if (currentExerciseIndex < currentWorkout.length - 1) {
      setCurrentExerciseIndex((i) => i + 1)
    } else {
      completeWorkout()
    }
  }

  function completeWorkout() {
    const workout: Workout = {
      id: createId(),
      name: `${selectedSplit} Day`,
      split: selectedSplit!,
      date: getToday(),
      exercises: currentWorkout,
      createdAt: new Date().toISOString(),
    }
    setWorkouts((prev) => [workout, ...prev])
    setScreen('home')
    setSelectedSplit(null)
    setCurrentWorkout([])
  }

  function updateSet(exerciseIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) {
    setCurrentWorkout((prev) => {
      const updated = [...prev]
      updated[exerciseIdx] = { ...updated[exerciseIdx], sets: [...updated[exerciseIdx].sets] }
      updated[exerciseIdx].sets[setIdx] = { ...updated[exerciseIdx].sets[setIdx], [field]: value }
      return updated
    })
  }

  function toggleSetDone(exerciseIdx: number, setIdx: number) {
    setCurrentWorkout((prev) => {
      const updated = [...prev]
      updated[exerciseIdx] = { ...updated[exerciseIdx], sets: [...updated[exerciseIdx].sets] }
      updated[exerciseIdx].sets[setIdx] = { 
        ...updated[exerciseIdx].sets[setIdx], 
        done: !updated[exerciseIdx].sets[setIdx].done 
      }
      return updated
    })
  }

  function addSet(exerciseIdx: number) {
    setCurrentWorkout((prev) => {
      const updated = [...prev]
      const lastSet = updated[exerciseIdx].sets[updated[exerciseIdx].sets.length - 1]
      updated[exerciseIdx] = { 
        ...updated[exerciseIdx], 
        sets: [...updated[exerciseIdx].sets, createSet(lastSet?.weight || '', lastSet?.reps || '8')]
      }
      return updated
    })
  }

  function addExerciseToTemplate(split: Split) {
    setTemplates((prev) =>
      prev.map((t) =>
        t.split === split
          ? { ...t, exercises: [...t.exercises, { name: '' }] }
          : t
      )
    )
  }

  function updateTemplateExercise(split: Split, idx: number, value: string) {
    setTemplates((prev) =>
      prev.map((t) =>
        t.split === split
          ? {
              ...t,
              exercises: t.exercises.map((ex, i) => (i === idx ? { name: value } : ex)),
            }
          : t
      )
    )
  }

  function removeTemplateExercise(split: Split, idx: number) {
    setTemplates((prev) =>
      prev.map((t) =>
        t.split === split
          ? { ...t, exercises: t.exercises.filter((_, i) => i !== idx) }
          : t
      )
    )
  }

  const progress = currentWorkout.length > 0 ? ((currentExerciseIndex + 1) / currentWorkout.length) * 100 : 0
  const currentExercise = currentWorkout[currentExerciseIndex]

  if (screen === 'edit-templates') {
    const editingSplit = selectedSplit
    const editingTemplate = templates.find((t) => t.split === editingSplit)

    return (
      <div className="app-shell">
        <header className="modal-header">
          <button className="back-btn" onClick={() => setScreen('home')}>← Back</button>
          <h1>Edit {editingSplit}</h1>
          <div />
        </header>

        <div className="template-editor">
          {editingTemplate?.exercises.map((ex, idx) => (
            <div key={idx} className="template-exercise-row">
              <input
                type="text"
                value={ex.name}
                onChange={(e) => updateTemplateExercise(editingSplit!, idx, e.target.value)}
                placeholder="Exercise name"
              />
              <button className="remove-btn" onClick={() => removeTemplateExercise(editingSplit!, idx)}>×</button>
            </div>
          ))}
          
          <button className="add-exercise-btn" onClick={() => addExerciseToTemplate(editingSplit!)}>
            + Add Exercise
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'home') {
    return (
      <div className="app-shell">
        <header className="home-header">
          <h1>Let's Train</h1>
          <p>Select your workout</p>
          {statusMessage && <p className="status-pill">{statusMessage}</p>}
        </header>

        <div className="split-grid">
          {templates.map((t) => (
            <div key={t.split} className="split-card-wrapper">
              <button className="split-card" onClick={() => startWorkout(t.split)}>
                <span className="split-emoji">
                  {t.split === 'Push' ? '💪' : t.split === 'Pull' ? '🦅' : '🦵'}
                </span>
                <span className="split-name">{t.split}</span>
                <span className="split-count">{t.exercises.length} exercises</span>
              </button>
              <button className="edit-template-btn" onClick={() => { setSelectedSplit(t.split); setScreen('edit-templates') }}>
                Edit
              </button>
            </div>
          ))}
        </div>

        <button className="history-toggle" onClick={syncFromServer}>
          Refresh exercises
        </button>

        {workouts.length > 0 && (
          <div className="history-controls">
            <button className="history-toggle" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? 'Hide' : 'View'} recent workouts
            </button>
          </div>
        )}

        {showHistory && (
          <>
            <div className="stats-section">
              <h3>All-Time PRs</h3>
              {(() => {
                const stats = getAllExerciseStats(workouts)
                const entries = Object.entries(stats)
                if (entries.length === 0) return <p className="no-stats">No PRs yet</p>
                return (
                  <div className="stats-list">
                    {entries.map(([name, pr]) => (
                      <div key={name} className="stat-item">
                        <span className="stat-name">{name}</span>
                        <span className="stat-value">{pr.weight} x {pr.reps}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
            <div className="history-list">
              <h3>Recent Workouts</h3>
              {workouts.slice(0, 10).map((w: Workout) => (
                <div key={w.id} className="history-item">
                  <div className="history-info">
                    <span>{w.date}</span>
                    <span>{w.split}</span>
                    <span>{w.exercises.length} exercises</span>
                  </div>
                  <button className="delete-btn" onClick={() => setDeleteConfirm(w)}>×</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  if (!currentExercise) {
    return (
      <div className="app-shell">
        <div className="empty-workout">
          <h2>No exercises configured</h2>
          <p>Add exercises to your {selectedSplit} template first</p>
          <button className="nav-btn primary" onClick={() => setScreen('home')}>Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell workout-screen">
      <div className="workout-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-text">
          {currentExerciseIndex + 1} / {currentWorkout.length}
        </p>
      </div>

      <div className="exercise-slide">
        <h2 className="exercise-title">{currentExercise?.name}</h2>
        {(() => {
          const pr = getExercisePR(currentExercise?.name || '', workouts)
          return pr ? <p className="exercise-pr">PR: {pr.weight} x {pr.reps}</p> : null
        })()}
        
        <div className="sets-container">
          {currentExercise?.sets.map((set, setIdx) => (
            <div key={set.id} className={`set-card ${set.done ? 'done' : ''}`}>
              <div className="set-header">
                <span>Set {setIdx + 1}</span>
                <button
                  className={`done-btn ${set.done ? 'done' : ''}`}
                  onClick={() => toggleSetDone(currentExerciseIndex, setIdx)}
                >
                  {set.done ? '✓' : '○'}
                </button>
              </div>
              <div className="set-inputs">
                <input
                  type="number"
                  inputMode="numeric"
                  value={set.weight}
                  onChange={(e) => updateSet(currentExerciseIndex, setIdx, 'weight', e.target.value)}
                  placeholder="lbs"
                />
                <span>x</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={set.reps}
                  onChange={(e) => updateSet(currentExerciseIndex, setIdx, 'reps', e.target.value)}
                  placeholder="reps"
                />
              </div>
            </div>
          ))}
        </div>

        <button className="add-set-btn" onClick={() => addSet(currentExerciseIndex)}>
          + Add set
        </button>
      </div>

      <div className="workout-nav">
        <button className="nav-btn secondary" onClick={() => setScreen('home')}>
          Exit
        </button>
        <button className="nav-btn primary" onClick={finishExercise}>
          {currentExerciseIndex === currentWorkout.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete workout?</h3>
            <p>{deleteConfirm!.date} - {deleteConfirm!.split}</p>
            <div className="modal-actions">
              <button className="nav-btn secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="nav-btn danger" onClick={() => deleteWorkout(deleteConfirm!.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App