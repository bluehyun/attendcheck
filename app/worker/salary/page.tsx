'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  formatDate,
  calculateWorkingHours,
  HOURLY_RATE,
  OVERTIME_MULTIPLIER,
  calculateWeeklyHolidayAllowance,
  getWeekStart,
  getWeekEnd,
} from '@/lib/utils';

interface DailyWage {
  date: string;
  hoursWorked: number;
  wage: number;
  isOvertime: boolean;
}

interface WeeklySummary {
  regularHours: number;
  overtimeHours: number;
  regularWage: number;
  overtimeWage: number;
  weeklyHolidayBonus: number;
  totalWage: number;
}

export default function WorkerWagePage() {
  const [phone, setPhone] = useState<string>('');
  const [workerName, setWorkerName] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [dailyWages, setDailyWages] = useState<DailyWage[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const supabase = createClient();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 전화번호로 출퇴근 기록에서 이름 확인
    const { data: latest } = await supabase
      .from('attendance')
      .select('name')
      .eq('phone', phone)
      .order('check_date', { ascending: false })
      .limit(1)
      .single();

    if (!latest) {
      alert('해당 전화번호의 근무 기록이 없습니다');
      setLoading(false);
      return;
    }

    setWorkerName(latest.name);
    await fetchWeeklyWage(phone, selectedWeek);
    setSearched(true);
    setLoading(false);
  };

  const fetchWeeklyWage = async (workerPhone: string, weekDate: Date) => {
    const weekStart = getWeekStart(weekDate);
    const weekEnd = getWeekEnd(weekDate);

    const { data: records } = await supabase
      .from('attendance')
      .select('*')
      .eq('phone', workerPhone)
      .gte('check_date', weekStart.toISOString().split('T')[0])
      .lte('check_date', weekEnd.toISOString().split('T')[0])
      .order('check_date', { ascending: true });

    if (!records || records.length === 0) {
      setDailyWages([]);
      setWeeklySummary({
        regularHours: 0,
        overtimeHours: 0,
        regularWage: 0,
        overtimeWage: 0,
        weeklyHolidayBonus: 0,
        totalWage: 0,
      });
      return;
    }

    // 일별 급여 계산
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;

    const daily = records
      .filter((r) => r.check_in_time && r.check_out_time)
      .map((record) => {
        const hoursWorked = calculateWorkingHours(
          new Date(record.check_in_time),
          new Date(record.check_out_time!)
        );

        const regularHours = Math.min(hoursWorked, 8);
        const overtimeHours = Math.floor(Math.max(0, hoursWorked - 8));

        totalRegularHours += regularHours;
        totalOvertimeHours += overtimeHours;

        const wage =
          Math.round(HOURLY_RATE * regularHours) +
          Math.round(HOURLY_RATE * OVERTIME_MULTIPLIER * overtimeHours);

        return {
          date: record.check_date,
          hoursWorked,
          wage,
          isOvertime: overtimeHours > 0,
        };
      });

    setDailyWages(daily);

    // 주간 급여 계산 (주휴수당: 주 5일 근무자 한정, (합계/40)*8*시급)
    const workedDays = daily.length;
    const totalWeeklyHours = totalRegularHours + totalOvertimeHours;
    const regularWage = Math.round(HOURLY_RATE * totalRegularHours);
    const overtimeWage = Math.round(HOURLY_RATE * OVERTIME_MULTIPLIER * totalOvertimeHours);
    const weeklyHolidayBonus = calculateWeeklyHolidayAllowance(totalWeeklyHours, workedDays);

    setWeeklySummary({
      regularHours: totalRegularHours,
      overtimeHours: totalOvertimeHours,
      regularWage,
      overtimeWage,
      weeklyHolidayBonus,
      totalWage: regularWage + overtimeWage + weeklyHolidayBonus,
    });
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate);

    if (workerName) {
      fetchWeeklyWage(phone, newDate);
    }
  };

  const weekStart = getWeekStart(selectedWeek);
  const weekEnd = getWeekEnd(selectedWeek);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-primary hover:underline mb-4 inline-block">
          ← 돌아가기
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-6 text-primary">급여 확인</h1>

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
              <>
                <div className="mb-6 pb-6 border-b">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {workerName}님의 급여 정보
                  </h2>
                </div>

                {/* 주간 선택 */}
                <div className="flex items-center justify-between mb-6 p-4 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => handleWeekChange('prev')}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    ← 이전 주
                  </button>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">선택된 주간</p>
                    <p className="font-semibold">
                      {formatDate(weekStart)} ~ {formatDate(weekEnd)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleWeekChange('next')}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    다음 주 →
                  </button>
                </div>

                {/* 주간 요약 */}
                {weeklySummary && (
                  <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {/* 좌측: 시간 정보 */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">근무 시간</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">정상근무:</span>
                          <span className="font-semibold">{weeklySummary.regularHours}시간</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">연장근무:</span>
                          <span className="font-semibold text-orange-600">
                            {weeklySummary.overtimeHours}시간
                          </span>
                        </div>
                        <div className="pt-2 border-t border-blue-200 flex justify-between">
                          <span className="text-gray-600 font-semibold">합계:</span>
                          <span className="font-bold text-lg">
                            {(
                              weeklySummary.regularHours + weeklySummary.overtimeHours
                            ).toFixed(1)}시간
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 우측: 급여 정보 */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">급여 정보</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">정상근무:</span>
                          <span className="font-semibold">
                            ₩{weeklySummary.regularWage.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">연장수당:</span>
                          <span className="font-semibold text-orange-600">
                            ₩{weeklySummary.overtimeWage.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">주휴수당:</span>
                          {weeklySummary.weeklyHolidayBonus > 0 ? (
                            <span className="font-semibold text-green-600">
                              ₩{weeklySummary.weeklyHolidayBonus.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">주 5일 근무 시 지급</span>
                          )}
                        </div>
                        <div className="pt-2 border-t border-green-200 flex justify-between">
                          <span className="text-gray-600 font-semibold">합계:</span>
                          <span className="font-bold text-lg text-green-700">
                            ₩{weeklySummary.totalWage.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 일별 상세 */}
                {dailyWages.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">일별 근무 현황</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              날짜
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              근무시간
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              일급
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              비고
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyWages.map((wage, idx) => (
                            <tr key={wage.date} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3 text-gray-800">
                                {formatDate(new Date(wage.date))}
                              </td>
                              <td className="px-4 py-3 text-gray-800">
                                {wage.hoursWorked}시간
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-800">
                                ₩{wage.wage.toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                {wage.isOvertime && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                    연장근무
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {dailyWages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">선택된 주간에 근무 기록이 없습니다</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
