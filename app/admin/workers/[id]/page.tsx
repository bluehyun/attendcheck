'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthGuard } from '@/components/AuthGuard';
import { formatDate, formatTime, calculateWorkingHours } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  name: string;
  check_date: string;
  check_in_time: string;
  check_out_time: string | null;
  working_hours: number | null;
}

export default function WorkerHistoryPage() {
  return (
    <AuthGuard requiredRole="admin">
      <WorkerHistoryContent />
    </AuthGuard>
  );
}

function WorkerHistoryContent() {
  const params = useParams();
  const phone = decodeURIComponent(params.id as string);

  const [workerName, setWorkerName] = useState<string>('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const supabase = createClient();

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('phone', phone)
      .gte('check_date', dateFrom)
      .lte('check_date', dateTo)
      .order('check_date', { ascending: false });

    if (data && data.length > 0) {
      setWorkerName(data[0].name);
    }

    const enriched = (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      check_date: r.check_date,
      check_in_time: r.check_in_time,
      check_out_time: r.check_out_time,
      working_hours:
        r.check_in_time && r.check_out_time
          ? calculateWorkingHours(new Date(r.check_in_time), new Date(r.check_out_time))
          : null,
    }));

    setRecords(enriched);
    setLoading(false);
  }, [supabase, phone, dateFrom, dateTo]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totalHours = records.reduce((sum, r) => sum + (r.working_hours ?? 0), 0);
  const workedDays = records.filter((r) => r.check_in_time).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {workerName ? `${workerName}님 근무 이력` : '근무 이력'}
            </h1>
            <p className="text-gray-500 mt-1">{phone}</p>
          </div>
          <Link href="/admin/workers" className="text-primary hover:underline">
            ← 근로자 목록
          </Link>
        </div>

        {/* 날짜 필터 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">시작일</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <span className="text-gray-500">~</span>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">종료일</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">총 근무일수</div>
            <div className="text-3xl font-bold text-primary mt-2">{workedDays}일</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">총 근무시간</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{totalHours.toFixed(1)}h</div>
          </div>
        </div>

        {/* 이력 테이블 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">상세 기록</h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">해당 기간에 근무 기록이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">날짜</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">출근</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">퇴근</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">근무시간</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, idx) => (
                    <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatDate(new Date(record.check_date))}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        {formatTime(new Date(record.check_in_time))}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        {record.check_out_time ? formatTime(new Date(record.check_out_time)) : '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {record.working_hours !== null ? `${record.working_hours}시간` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {record.check_out_time ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">완료</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">진행 중</span>
                        )}
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
