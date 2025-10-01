import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'
import { Heart } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      router.push('/app')
    }
  }, [user, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 flex items-center justify-center p-6">
      <div className="text-center max-w-2xl">
        <div className="w-24 h-24 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl">
          <Heart className="w-12 h-12 text-white" fill="white" />
        </div>
        <h1 className="text-7xl font-bold text-slate-800 mb-4">Pulse</h1>
        <p className="text-xl text-slate-600 mb-8">Your weekly check-in. Raw. Real. Just you.</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/login')}
            className="bg-gradient-to-r from-rose-400 to-orange-400 text-white font-semibold px-8 py-4 rounded-2xl hover:shadow-lg transition-shadow"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}