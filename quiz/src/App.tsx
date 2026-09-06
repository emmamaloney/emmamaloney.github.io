import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css' // get styling

type Pub = {
  id: number
  name: string
  city: string
}

type Quiz = {
  id: number
  pub_id: number
  name: string
  time: string
  date: string
}

// available screens
type Screen = 'quizzes' |'pubs' | 'leaderboard' | 'play' | 'profile'

export default function App() {

  const [pubs, updatePubs] = useState<Pub[]>([]) // creates object to store pubs (array of Pub-objects)
  const [quizzes, updateQuizzes] = useState<Quiz[]>([])

  const [currentScreen, setCurrentScreen] = useState<Screen>('quizzes')

  // define Authentication States (React watches useState)
  const [user, setUser] = useState<any>(null) // CHANGE LATER W. "TYPE" - who is currently logged in
  const [email, setEmail] = useState('') // email has no initial value, updated by setEmail
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('') // new password during reset
  const [isHostMode, setIsHostMode] = useState(false) // trying to log in as host?
  const [authLoading, setAuthLoading] = useState(false) // "is supabase currently doing something?"

  // Password View States
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isCreatingPassword, setIsCreatingPassword] = useState(false)

  // var to check if user exists, and if so, if it is a host
  const [isHost, setIsHost] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // admin inviting emails
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)


  // Load local session automatically on startup + listen for changes
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null
  
      setUser(currentUser)
  
      if (currentUser) {
        await loadProfile(currentUser.id)
      }
    })
  
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
  
        setUser(currentUser)
  
        if (event === 'SIGNED_IN' && currentUser) {
          await loadProfile(currentUser.id)
        }
  
        if (event === 'PASSWORD_RECOVERY') {
          setCurrentScreen('profile')
          setIsResettingPassword(true)
        }
      }
    )
  
    return () => subscription.unsubscribe()
  }, [])

  // Load pubs for pubs list rendering
  useEffect(() => {
    async function loadPubs() { // load data from supabase to pubs Pub-object
      const { data, error } = await supabase
        .from('pubs')
        .select('*')

      if (error) {
        console.error(error)
        return // do nothing if cannot load pubs (empty list)
      }
      updatePubs(data)
    }
    loadPubs()
  }, [])

  useEffect(() => {
    async function loadQuizzes() { // load data from supabase to pubs Pub-object
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')

      if (error) {
        console.error(error)
        return // do nothing if cannot load pubs (empty list)
      }
      updateQuizzes(data)
    }
    loadQuizzes()
  }, [])

  // Place this inside your App component, before the return statement
  const getPubName = (pubId: number) => {
    const pub = pubs.find((p) => p.id === pubId)
    return pub ? pub.name : 'Unknown Pub'
  }

  // Player Combined Login / Sign Up Handler + Host login
  async function handleCombinedAuth(e: React.SubmitEvent) { // async to wait (supabase comm.), e=browser's event
    e.preventDefault() // stop browser from reloading
    setAuthLoading(true)

    // sends email + password to Supabase 
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // check for errors
    if (signInError) {

      // for hosts
      if (isHostMode) { 
        alert('Host login failed. Host accounts must be pre-created.')
      }

      // for players: if cannot login, try signup 
      else if (signInError.message.includes('Invalid login credentials')) {
        // sign up
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { is_host: false },
          },
        })

        
        if (signUpError) {
          alert(signUpError.message) // if cannot sign up alert w. message
        } 
        else {
          alert('Player account created and logged in!')
        }
      } 

      // general error
      else { 
        alert(signInError.message)
      }
      
    }
    
    setAuthLoading(false)
  }

  async function inviteHost() {
    setInviteLoading(true)
  
    const { data, error } = await supabase.functions.invoke('invite-host', {
      body: { email: inviteEmail }
    })
  
    console.log('Function data:', data)
    console.log('Function error:', error)
  
    if (error) {
      console.log('Error context:', error.context)
  
      if (error.context) {
        console.log('Response:', await error.context.text())
      }
  
      alert('Function failed — check console')
    } else {
      alert('Invitation sent!')
      setInviteEmail('')
    }
  
    setInviteLoading(false)
  }
  

  async function loadProfile(userId: string) {
    console.log('Loading profile for:', userId)
    const { data, error } = await supabase
      .from('profiles')
      .select('is_host, is_admin, pending_invite')
      .eq('id', userId)
      .single()
  
    if (error) {
      console.error(error)
      return
    }
    
    console.log('Profile data:', data)
  
    setIsHost(data.is_host)
    setIsAdmin(data.is_admin)
  
    if (data.pending_invite) {
      setCurrentScreen('profile')
      setIsCreatingPassword(true)
    }
  }

  // Request Password Reset Email
  async function handleSendResetEmail(e: React.SubmitEvent) {
    e.preventDefault()
    setAuthLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // Redirect back to your app URL
    })

    if (error) {
      alert(error.message)
    } else {
      alert('Password reset link sent! Check your inbox.')
      setIsForgotPassword(false)
    }

    setAuthLoading(false)
  }

  // Update Password (after clicking reset link)
  async function handleUpdatePassword(e: React.SubmitEvent) {
    e.preventDefault()
    setAuthLoading(true)

    // update user's password (encrypted)
    const { error } = await supabase.auth.updateUser({ // auth.users
      password: newPassword,
    })

    if (error) { // error
      alert(error.message)
    } else { // password update success
      alert('Password updated successfully!')
      setIsResettingPassword(false) // case closed
      setNewPassword('')
    }

    setAuthLoading(false)
  }

  // Update Password (after clicking reset link)
  async function handleCreatePassword(e: React.SubmitEvent) {
    e.preventDefault()
    setAuthLoading(true)
  
    // Actually create the Auth password
    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword,
    })
  
    if (passwordError) {
      alert(passwordError.message)
      setAuthLoading(false)
      return
    }
  
    // Mark invitation as completed
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        pending_invite: false,
        is_host: true,
      })
      .eq('id', user.id)
  
    if (profileError) {
      alert(profileError.message)
      setAuthLoading(false)
      return
    }
  
    alert('Password created successfully! Welcome!')
  
    setIsCreatingPassword(false)
    setNewPassword('')
    setCurrentScreen('profile')
  
    setAuthLoading(false)
  }


  // Handle Logout
  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null) 
  }

  return (
    <div>
      {/* HEADER */}
      <header>
        <h1 className='logo'>QuizLeague</h1>
        <p>Come for the quiz. Stay for the competition.</p>
      </header>

      {/* SCREEN 1: QUIZZES */}
      {currentScreen === 'quizzes' && (
        <main>
          <h2>Quizzes</h2>
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="pub-card">
              <strong>{quiz.name}</strong>
              <p>Location: {getPubName(quiz.pub_id)}</p>
            </div>
          ))}
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
          <h3>Scan QR Code</h3>
          <h3>Enter Pub Code</h3>
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
          {/* VIEW 1: User clicked password recovery link in email */}
          {isCreatingPassword ? (
            <div className="auth-container">
              <h2>Create New Password</h2>
              <p>Welcome to QuizLeague! Please create a password for your account.</p>

              <form onSubmit={handleCreatePassword} className="auth-form">
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="auth-input"
                  required
                />

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={authLoading}
                >
                  {authLoading ? 'Creating...' : 'Create Password'}
                </button>
              </form>
            </div>
          ) : isResettingPassword ? (
            <div className="auth-container">
              <h2>Set New Password</h2>
              <form onSubmit={handleUpdatePassword} className="auth-form">
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="auth-input"
                  required
                />
                <button type="submit" className="auth-submit-btn" disabled={authLoading}>
                  {authLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          ) : user ? (
            /* VIEW 2: Logged In */
            <div className="profile-container">
              <h2>Profile</h2>
              <p>Email: <strong>{user.email}</strong></p>
              <p>
                Account Type: <strong>
                  {isAdmin ? 'Admin' : isHost ? 'Quiz Host' : 'Player'}
                </strong>
              </p>
              {isAdmin && (
                <div>
                  <h3>Invite Host</h3>

                  <input
                    type="email"
                    placeholder="Host email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="auth-input"
                  />

                  <button
                    onClick={inviteHost}
                    disabled={inviteLoading}
                    className="auth-submit-btn"
                  >
                    {inviteLoading ? 'Sending...' : 'Invite Host'}
                  </button>
                </div>
              )}
              <button onClick={handleLogout} className="auth-submit-btn">
                Log Out
              </button>
            </div>
          ) : isForgotPassword ? (
            /* VIEW 3: Forgot Password Request Form */
            <div className="auth-container">
              <h2>Reset Password</h2>
              <p>Enter your email to receive a password reset link.</p>
              <form onSubmit={handleSendResetEmail} className="auth-form">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  required
                />
                <button type="submit" className="auth-submit-btn" disabled={authLoading}>
                  {authLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <button
                type="button"
                className="host-toggle-btn"
                onClick={() => setIsForgotPassword(false)}
              >
                ← Back to Login
              </button>
            </div>
          ) : (
            /* VIEW 4: Normal Login/Signup Form */
            <div className="auth-container">
              <h2>{isHostMode ? 'Host Portal' : 'Player Portal'}</h2>
              <p>
                {isHostMode
                  ? 'Sign in to your host account.'
                  : 'Enter your details to log in or create a player account.'}
              </p>

              <form onSubmit={handleCombinedAuth} className="auth-form">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  required
                />

                <button type="submit" className="auth-submit-btn" disabled={authLoading}>
                  {authLoading ? 'Processing...' : 'Continue'}
                </button>
              </form>

              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', marginTop: '8px' }}
                onClick={() => setIsForgotPassword(true)}
              >
                Forgot password?
              </button>

              <button
                type="button"
                className="host-toggle-btn"
                onClick={() => setIsHostMode(!isHostMode)}
              >
                {isHostMode ? '← Back to Player Portal' : 'Are you a host?'}
              </button>
            </div>
          )}
        </main>
      )}

      {/* FIXED BOTTOM NAVBAR */}
      <nav className="bottom-nav">
        <button
          className={`nav-button ${currentScreen === 'quizzes' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('quizzes')}
        >
          Quizzes
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
          onClick={() => {
            setCurrentScreen('profile')

            if (user) {
              loadProfile(user.id)
            }
          }}
        >
          Profile
        </button>
      </nav>
    </div>
  )
}
