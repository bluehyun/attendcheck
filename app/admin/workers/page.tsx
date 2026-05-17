'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthGuard } from '@/components/AuthGuard';

interface Worker {
  phone: string;
  name: string;
  lastDate: string;
}

export default function AdminWorkersPage() {
  return (
    <AuthGuard requiredRole="admin">
      <WorkersContent />
    </AuthGuard>
  );
}

function WorkersContent() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('attendance')
      .select('phone, name, check_date')
      .order('check_date', { ascending: false });

    if (!data) {
      setWorkers([]);
      setLoading(false);
      return;
    }

    // 전화번호 기준으로 중복 제거 (가장 최근 기록 기준)
    const map = new Map<string, Worker>();
    for (const row of data) {
      if (!map.has(row.phone)) {
        map.set(row.phone, { phone: row.phone, name: row.name, lastDate: row.check_date });
      }
    }

    setWorkers(Array.from(map.values()));
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary">근로자 목록</h1>
          <Link href="/admin" className="text-primary hover:underline">
            대시보드로 →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : workers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">출퇴근 기록이 없습니다</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">이름</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">전화번호</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">최근 근무일</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">이력</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker, idx) => (
                    <tr key={worker.phone} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">{worker.name}</td>
                      <td className="px-4 py-3 text-gray-600">{worker.phone}</td>
                      <td className="px-4 py-3 text-gray-600">{worker.lastDate}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/workers/${encodeURIComponent(worker.phone)}`}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                        >
                          이력 보기
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
