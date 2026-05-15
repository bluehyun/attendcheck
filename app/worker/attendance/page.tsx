'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatTime, calculateWorkingHours } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  check_date: string;
  check_in_time: string;
  check_out_time: string | null;
  working_hours?: number;
}

export default function WorkerAttendancePage() {
  const [workerName, setWorkerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const supabase = createClient();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 전화번호로 근로자 검색
    const { data: worker, error } = await supabase
      .from('workers')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !worker) {
      alert('등록되지 않은 전화번호입니다');
      setLoading(false);
      return;
    }

    setWorkerName(worker.name);

    // 출퇴근 기록 조회
    const { data: records, error: recordError } = await supabase
      .from('attendance')
      .select('*')
      .eq('worker_id', worker.id)
      .order('check_date', { ascending: false });

    if (recordError) {
      alert('데이터 조회에 실패했습니다');
      setLoading(false);
      return;
    }

    const enrichedRecords = (records || []).map((record) => ({
      ...record,
      working_hours: record.check_out_time
        ? calculateWorkingHours(
            new Date(record.check_in_time),
            new Date(record.check_out_time)
          )
        : 0,
    }));

    setAttendance(enrichedRecords);
    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-primary hover:underline mb-4 inline-block">
          ← 돌아가기
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-6 text-primary">출퇴근 현황</h1>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전화번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="예: 010-1234-5678"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? '조회 중...' : '조회'}
            </button>
          </form>
        </div>

        {searched && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            {workerName && (
              <div className="mb-6 pb-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">
                  {workerName}님의 출퇴근 현황
                </h2>
              </div>
            )}

            {attendance.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">조회된 근무 기록이 없습니다</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        날짜
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        출근
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        퇴근
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        근무시간
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        상태
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record, idx) => (
                      <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {formatDate(new Date(record.check_date))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {formatTime(new Date(record.check_in_time))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {record.check_out_time
                            ? formatTime(new Date(record.check_out_time))
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                          {record.working_hours || '-'}시간
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {record.check_out_time ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                              진행 중
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
        )}
      </div>
    </div>
  );
}
