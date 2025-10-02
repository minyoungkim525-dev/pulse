import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Let Supabase automatically handle the callback
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error);
        router.push('/login?error=auth_failed');
        return;
      }

      if (session) {
        router.push('/app');
      } else {
        router.push('/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Completing sign in...</p>
      </div>
    </div>
  );
}