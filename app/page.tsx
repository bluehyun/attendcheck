'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // 관리자인지 확인
        const { data: admin } = await supabase
          .from('admins')
          .select('*')
          .eq('id', user.id)
          .single();

        if (admin) {
          router.push('/admin');
        } else {
          router.push('/worker');
        }
      } else {
        router.push('/auth/login');
      }
    };

    checkAuth();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">로드 중...</p>
      </div>
    </div>
  );
}
