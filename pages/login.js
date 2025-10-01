import { useState } from 'react'
import { useRouter } from 'next/router'
import SignInForm from '../components/Auth/SignInForm'
import SignUpForm from '../components/Auth/SignUpForm'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/app')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 flex items-center justify-center py-12">
      {isSignUp ? (
        <SignUpForm 
          onSuccess={handleSuccess}
          onSwitchToSignIn={() => setIsSignUp(false)}
        />
      ) : (
        <SignInForm 
          onSuccess={handleSuccess}
          onSwitchToSignUp={() => setIsSignUp(true)}
        />
      )}
    </div>
  )
}