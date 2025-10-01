import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function SignUpForm({ onSuccess, onSwitchToSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const { signUp, signInWithGoogle } = useAuth()

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signUp({ email, password })
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white rounded-3xl p-8 border-2 border-emerald-200 shadow-xl text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">✉️</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Check your email!</h2>
          <p className="text-slate-600 mb-6">
            We sent you a confirmation link. Click it to activate your account.
          </p>
          <button
            onClick={onSwitchToSignIn}
            className="text-rose-500 hover:underline font-semibold"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white rounded-3xl p-8 border-2 border-orange-200 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">🌱</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Join Pulse</h2>
          <p className="text-slate-600">Start tracking your growth journey</p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-rose-400 focus:outline-none transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-rose-400 focus:outline-none transition-colors"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <p className="text-xs text-slate-500 mt-1">At least 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-400 to-orange-400 text-white font-semibold py-4 rounded-2xl hover:shadow-lg transition-shadow disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white border-2 border-slate-200 text-slate-700 font-semibold py-4 rounded-2xl hover:border-slate-300 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToSignIn}
            className="text-sm text-slate-600 hover:text-rose-500"
          >
            Already have an account? <span className="font-semibold">Sign in</span>
          </button>
        </div>
      </div>
    </div>
  )
}