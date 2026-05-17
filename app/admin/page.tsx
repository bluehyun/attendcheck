'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatTime, calculateWorkingHours } from '@/lib/utils';
import { AuthGuard } from '@/components/AuthGuard';

interface WorkerAttendance {
  worker_id: string;
  worker_name: string;
  phone: string;
  check_date: string;
  check_in_time: string;
  check_out_time: string | null;
  working_hours?: number | null;
}

export default function AdminDashboardPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminContent />
    </AuthGuard>
  );
}

function AdminContent() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<WorkerAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  useEffect(() => {
    fetchDailyAttendance(selectedDate);
  }, [selectedDate]);

  const fetchDailyAttendance = async (date: string) => {
    setLoading(true);

    const { data: records, error } = await supabase
      .from('attendance')
      .select(
        `
        *,
        workers:worker_id(id, name, phone)
      `
      )
      .eq('check_date', date)
      .order('check_in_time', { ascending: true });

    if (error) {
      console.error('Error fetching attendance:', error);
      setAttendanceData([]);
      setLoading(false);
      return;
    }

    const enriched = (records || []).map((record: any) => ({
      worker_id: record.worker_id,
      worker_name: record.workers?.name || 'Unknown',
      phone: record.workers?.phone || '-',
      check_date: record.check_date,
      check_in_time: record.check_in_time,
      check_out_time: record.check_out_time,
      working_hours: record.check_out_time
        ? calculateWorkingHours(
            new Date(record.check_in_time),
            new Date(record.check_out_time)
          )
        : null,
    }));

    setAttendanceData(enriched);
    setLoading(false);
  };

  // 통계 계산
  const totalWorkers = new Set(attendanceData.map((a) => a.worker_id)).size;
  const checkedIn = attendanceData.filter((a) => a.check_in_time).length;
  const checkedOut = attendanceData.filter((a) => a.check_out_time).length;
  const totalWorkingHours = attendanceData.reduce((sum, a) => sum + (a.working_hours || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary">관리자 대시보드</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors text-sm"
          >
            로그아웃
          </button>
        </div>

        {/* 상단 네비게이션 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <label className="font-semibold text-gray-700">조회 날짜:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-4 py-2 bg-secondary text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              오늘
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">등록 근로자</div>
            <div className="text-3xl font-bold text-primary mt-2">{totalWorkers}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">출근 인원</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{checkedIn}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">퇴근 인원</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{checkedOut}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">총 근무시간</div>
            <div className="text-3xl font-bold text-accent mt-2">
              {totalWorkingHours.toFixed(1)}h
            </div>
          </div>
        </div>

        {/* 상세 테이블 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            {formatDate(new Date(selectedDate))} 근무 현황
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">로딩 중...</p>
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">조회된 근무 기록이 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      이름
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      전화번호
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      출근 시간
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      퇴근 시간
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      근무 시간
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((record, idx) => (
                    <tr key={`${record.worker_id}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {record.worker_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {record.phone}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {record.check_in_time
                          ? formatTime(new Date(record.check_in_time))
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {record.check_out_time
                          ? formatTime(new Date(record.check_out_time))
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                        {record.working_hours
                          ? `${record.working_hours}시간`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.check_out_time ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            ✓ 완료
                          </span>
                        ) : record.check_in_time ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            ○ 진행 중
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            - 미출근
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 관리자 메뉴 */}
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
          <h3 className="text-lg font-bold mb-4 text-gray-800">추가 기능</h3>
          <div className="flex gap-4">
            <Link
              href="/admin/salary"
              className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              개인별 급여 조회
            </Link>
            <Link
              href="/admin/workers"
              className="px-6 py-3 bg-secondary text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              근로자 관리
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
