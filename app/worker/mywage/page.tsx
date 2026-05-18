'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  HOURLY_RATE,
  OVERTIME_MULTIPLIER,
  calculateWorkingHours,
} from '@/lib/utils';

interface DailyRecord {
  date: string;
  workingHours: number;
  overtimeHours: number;
  dailyWage: number;
}

// calculateWorkingHours 내부에서 이미 점심시간(1h) 차감 처리됨
function calcDailyWage(checkIn: string, checkOut: string) {
  const workingHours = calculateWorkingHours(new Date(checkIn), new Date(checkOut));
  const baseHours = Math.min(workingHours, 8);
  const overtimeHours = Math.floor(Math.max(0, workingHours - 8));
  const dailyWage =
    Math.floor(baseHours * HOURLY_RATE) +
    Math.floor(overtimeHours * HOURLY_RATE * OVERTIME_MULTIPLIER);

  return { workingHours, overtimeHours, dailyWage };
}

export default function MyWagePage() {
  const searchParams = useSearchParams();
  const initPhone = searchParams.get('phone') ?? '';
  const initName = searchParams.get('name') ?? '';

  const [phone, setPhone] = useState(initPhone);
  const [workerName, setWorkerName] = useState(initName);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const supabase = createClient();

  const fetchData = useCallback(async (targetPhone: string) => {
    if (!targetPhone) return;
    setLoading(true);
    setSearched(false);

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('phone', targetPhone)
      .order('check_date', { ascending: false });

    if (!data || data.length === 0) {
      alert('해당 전화번호의 근무 기록이 없습니다.');
      setLoading(false);
      return;
    }

    if (!initName) setWorkerName(data[0].name);

    const daily: DailyRecord[] = data
      .filter((r) => r.check_in_time && r.check_out_time)
      .map((r) => {
        const { workingHours, overtimeHours, dailyWage } = calcDailyWage(
          r.check_in_time,
          r.check_out_time
        );
        return { date: r.check_date, workingHours, overtimeHours, dailyWage };
      });

    setRecords(daily);
    setSearched(true);
    setLoading(false);
  }, [supabase, initName]);

  // 쿼리 파라미터로 phone이 넘어온 경우 자동 조회
  useEffect(() => {
    if (initPhone) {
      fetchData(initPhone);
    }
  }, [initPhone, fetchData]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(phone);
  };

  const totalWage = records.reduce((sum, r) => sum + r.dailyWage, 0);
  const totalDays = records.length;
  const totalHours = records.reduce((sum, r) => sum + r.workingHours, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/worker" className="text-blue-600 hover:underline mb-4 inline-block text-sm">
          ← 출퇴근 화면으로
        </Link>

        {/* 전화번호 직접 입력할 때만 폼 표시 (쿼리 파라미터 없는 경우) */}
        {!initPhone && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold mb-6 text-blue-600">내 급여 조회</h1>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="전화번호를 입력하세요 (예: 01012345678)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? '조회 중...' : '조회'}
              </button>
            </form>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center text-gray-500">
            조회 중...
          </div>
        )}

        {/* 결과 */}
        {searched && !loading && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-black mb-1">
              {workerName}님의 급여 내역
            </h2>
            <p className="text-sm text-gray-500 mb-6">전체 근무 기록 기준</p>

            {records.length === 0 ? (
              <p className="text-center py-8 text-gray-500">완료된 근무 기록이 없습니다.</p>
            ) : (
              <>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-3 text-left font-semibold text-black">근무일</th>
                        <th className="px-4 py-3 text-right font-semibold text-black">근무시간</th>
                        <th className="px-4 py-3 text-right font-semibold text-black">시급</th>
                        <th className="px-4 py-3 text-right font-semibold text-black">일당 급여</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, idx) => (
                        <tr
                          key={r.date}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="px-4 py-3 text-black font-medium">{r.date}</td>
                          <td className="px-4 py-3 text-right text-black">
                            {r.workingHours}시간
                            {r.overtimeHours > 0 && (
                              <span className="ml-1 text-xs text-orange-600">
                                (연장 {r.overtimeHours}h)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-black">
                            {HOURLY_RATE.toLocaleString()}원
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-black">
                            {r.dailyWage.toLocaleString()}원
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 합계 */}
                <div className="border-t-2 border-gray-300 pt-4 space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>총 근무일</span>
                    <span className="font-semibold text-black">{totalDays}일</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>총 근무시간</span>
                    <span className="font-semibold text-black">{totalHours.toFixed(1)}시간</span>
                  </div>
                  <div className="flex justify-between items-center bg-green-50 rounded-lg p-4 border border-green-200">
                    <span className="text-lg font-bold text-black">총 급여 합계</span>
                    <span className="text-2xl font-bold text-green-700">
                      {totalWage.toLocaleString()}원
                    </span>
                  </div>
                  <p className="text-center text-sm font-semibold text-red-600">
                    ※ 세전 금액입니다
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
