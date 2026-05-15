'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface NavigationProps {
  isAdmin?: boolean;
}

export default function Navigation({ isAdmin = false }: NavigationProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user ?? null);
      setLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription?.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return null;
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <Link href={isAdmin ? '/admin' : '/worker'} className="text-2xl font-bold text-blue-600">
            출퇴근
          </Link>

          {/* 메뉴 */}
          <div className="hidden md:flex items-center space-x-8">
            {isAdmin ? (
              <>
                <Link href="/admin" className="text-gray-700 hover:text-blue-600 font-medium">
                  대시보드
                </Link>
                <Link href="/admin/workers" className="text-gray-700 hover:text-blue-600 font-medium">
                  근로자 관리
                </Link>
                <Link href="/admin/salary" className="text-gray-700 hover:text-blue-600 font-medium">
                  급여 조회
                </Link>
              </>
            ) : (
              <>
                <Link href="/worker" className="text-gray-700 hover:text-blue-600 font-medium">
                  출퇴근 체크
                </Link>
                <Link href="/worker/attendance" className="text-gray-700 hover:text-blue-600 font-medium">
                  근태 현황
                </Link>
                <Link href="/worker/salary" className="text-gray-700 hover:text-blue-600 font-medium">
                  급여 조회
                </Link>
              </>
            )}
          </div>

          {/* 사용자 정보 및 로그아웃 */}
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
