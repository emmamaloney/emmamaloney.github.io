import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

type Pub = {
  id: number
  name: string
  city: string
}

// available screens
type Screen = 'home' |'pubs' | 'leaderboard' | 'play' | 'profile'

export default function App() {
  const [pubs, updatePubs] = useState<Pub[]>([]) // creates object to store pubs (array of Pub-objects)
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')

  useEffect(() => {
    async function loadPubs() { // load data from supabase to pubs Pub-object
      const { data, error } = await supabase
        .from('pubs')
        .select('*')

      if (error) {
        console.error(error)
        return
      }
      updatePubs(data)
    }
    loadPubs()
  }, [])

  return (
    <div>
      {/* HEADER */}
      <header>
        <h1>QuizLeague</h1>
        <p>Come for the quiz. Stay for the competition.</p>
      </header>

      {/* SCREEN 1: HOME */}
      {currentScreen === 'home' && (
        <main>
          <h2>Home</h2>
          <p>User settings coming soon...</p>
        </main>
      )}

      {/* SCREEN 2: PUBS */}
      {currentScreen === 'pubs' && (
        <main>
          <h2>Pubs</h2>
          {pubs.map((pub) => (
            <div key={pub.id} className="pub-card">
              <strong>{pub.name}</strong>
              <p>{pub.city}</p>
            </div>
          ))}
        </main>
      )}

      {/* SCREEN 3: PLAY */}
      {currentScreen === 'play' && (
        <main>
          <h2>Play</h2>
          <p>User settings coming soon...</p>
        </main>
      )}

      {/* SCREEN 4: LEADERBOARD */}
      {currentScreen === 'leaderboard' && (
        <main>
          <h2>Leaderboard</h2>
          <p>User settings coming soon...</p>
        </main>
      )}

      {/* SCREEN 5: PROFILE */}
      {currentScreen === 'profile' && (
        <main>
          <h2>Profile</h2>
          <p>User settings coming soon...</p>
        </main>
      )}

      {/* FIXED BOTTOM NAVBAR */}
      <nav className="bottom-nav">
        <button
          className={`nav-button ${currentScreen === 'home' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('home')}
        >
          Home
        </button>
        <button
          className={`nav-button ${currentScreen === 'pubs' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('pubs')}
        >
          Pubs
        </button>
        <button
          className={`nav-button ${currentScreen === 'play' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('play')}
        >
          Play
        </button>
        <button
          className={`nav-button ${currentScreen === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          className={`nav-button ${currentScreen === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('profile')}
        >
          Profile
        </button>
      </nav>
    </div>
  )
}
