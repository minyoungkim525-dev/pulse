import ProtectedRoute from '../components/ProtectedRoute'
import Pulse from '../components/Pulse'
import { useAuth } from '../contexts/AuthContext'
import { LogOut } from 'lucide-react'

export default function AppPage() {
  const { user, signOut } = useAuth()

  return (
    <ProtectedRoute>
      <div className="relative">
        {/* User menu in top right */}
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white rounded-2xl p-3 border-2 border-orange-200 shadow-lg">
            <p className="text-xs text-slate-600 mb-2">{user?.email}</p>
            <button
              onClick={signOut}
              className="text-xs text-rose-500 hover:underline flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </div>
        
        <Pulse />
      </div>
    </ProtectedRoute>
  )
}