'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthGuard } from '@/components/AuthGuard';
import {
  formatDate,
  calculateWorkingHours,
  HOURLY_RATE,
  OVERTIME_MULTIPLIER,
  WEEKLY_HOLIDAY_ALLOWANCE,
  WEEKLY_MINIMUM_HOURS,
  getWeekStart,
  getWeekEnd,
} from '@/lib/utils';

interface WorkerSalary {
  worker_id: string;
  worker_name: string;
  phone: string;
  regularHours: number;
  overtimeHours: number;
  regularWage: number;
  overtimeWage: number;
  weeklyHolidayBonus: number;
  totalWage: number;
}

export default function AdminSalaryPage() {
  return (
    <AuthGuard requiredRole="admin">
      <SalaryContent />
    </AuthGuard>
  );
}

function SalaryContent() {
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [workersSalaries, setWorkersSalaries] = useState<WorkerSalary[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchWeeklySalaries(selectedWeek);
  }, [selectedWeek]);

  const fetchWeeklySalaries = async (weekDate: Date) => {
    setLoading(true);

    const weekStart = getWeekStart(weekDate);
    const weekEnd = getWeekEnd(weekDate);
    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    // 해당 주간의 attendance 전체 조회
    const { data: records } = await supabase
      .from('attendance')
      .select('*')
      .gte('check_date', startStr)
      .lte('check_date', endStr);

    if (!records) {
      setWorkersSalaries([]);
      setLoading(false);
      return;
    }

    // 전화번호 기준으로 근로자별 집계
    const phoneMap = new Map<string, { name: string; records: typeof records }>();
    for (const r of records) {
      if (!phoneMap.has(r.phone)) {
        phoneMap.set(r.phone, { name: r.name, records: [] });
      }
      phoneMap.get(r.phone)!.records.push(r);
    }

    const salaries: WorkerSalary[] = [];

    for (const [phone, { name, records: workerRecords }] of phoneMap) {
      let totalRegularHours = 0;
      let totalOvertimeHours = 0;

      workerRecords.forEach((record) => {
        if (record.check_in_time && record.check_out_time) {
          const hoursWorked = calculateWorkingHours(
            new Date(record.check_in_time),
            new Date(record.check_out_time)
          );
          totalRegularHours += Math.min(hoursWorked, 8);
          totalOvertimeHours += Math.floor(Math.max(0, hoursWorked - 8));
        }
      });

      const regularWage = Math.round(HOURLY_RATE * totalRegularHours);
      const overtimeWage = Math.round(HOURLY_RATE * OVERTIME_MULTIPLIER * totalOvertimeHours);
      const weeklyHolidayBonus =
        totalRegularHours + totalOvertimeHours >= WEEKLY_MINIMUM_HOURS
          ? WEEKLY_HOLIDAY_ALLOWANCE
          : 0;

      salaries.push({
        worker_id: phone,
        worker_name: name,
        phone,
        regularHours: Math.round(totalRegularHours * 10) / 10,
        overtimeHours: Math.round(totalOvertimeHours * 10) / 10,
        regularWage,
        overtimeWage,
        weeklyHolidayBonus,
        totalWage: regularWage + overtimeWage + weeklyHolidayBonus,
      });
    }

    setWorkersSalaries(salaries.sort((a, b) => b.totalWage - a.totalWage));
    setLoading(false);
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate);
  };

  const weekStart = getWeekStart(selectedWeek);
  const weekEnd = getWeekEnd(selectedWeek);
  const totalPayroll = workersSalaries.reduce((sum, w) => sum + w.totalWage, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary">개인별 급여 조회</h1>
          <Link href="/admin" className="text-primary hover:underline">
            대시보드로 →
          </Link>
        </div>

        {/* 주간 선택 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleWeekChange('prev')}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition-colors"
            >
              ← 이전 주
            </button>
            <div className="text-center">
              <p className="text-sm text-gray-600">선택된 주간</p>
              <p className="text-xl font-bold text-black">
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
        </div>

        {/* 급여 요약 */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">근로자 수</div>
            <div className="text-3xl font-bold text-primary mt-2">
              {workersSalaries.filter((w) => w.totalWage > 0).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">총 근무시간</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {(
                workersSalaries.reduce((sum, w) => sum + w.regularHours + w.overtimeHours, 0)
              ).toFixed(1)}
              h
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">총 급여</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              ₩{totalPayroll.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 급여 테이블 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">급여 상세 현황</h2>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">로딩 중...</p>
            </div>
          ) : workersSalaries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">조회된 근로자가 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-black">이름</th>
                    <th className="px-4 py-3 text-left font-semibold text-black">
                      전화번호
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-black">
                      정상 시간
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-black">
                      연장 시간
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-black">
                      기본급
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-black">
                      연장수당
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-black">
                      주휴수당
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-black">
                      합계
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workersSalaries.map((worker, idx) => (
                    <tr key={worker.worker_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {worker.worker_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{worker.phone}</td>
                      <td className="px-4 py-3 text-right text-gray-800">
                        {worker.regularHours}h
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600 font-semibold">
                        {worker.overtimeHours}h
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800">
                        ₩{worker.regularWage.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600 font-semibold">
                        ₩{worker.overtimeWage.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-semibold">
                        {worker.weeklyHolidayBonus > 0
                          ? `₩${worker.weeklyHolidayBonus.toLocaleString()}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-lg text-primary">
                        ₩{worker.totalWage.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td colSpan={7} className="px-4 py-3 font-bold text-gray-800">
                      합계
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-lg text-green-600">
                      ₩{totalPayroll.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 내보내기 버튼 */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => {
              const csv = generateCSV(workersSalaries);
              downloadCSV(csv, `급여현황_${formatDate(weekStart)}.csv`);
            }}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            CSV 다운로드
          </button>
          <Link
            href="/admin"
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

function generateCSV(workers: WorkerSalary[]): string {
  const headers = ['이름', '전화번호', '정상시간', '연장시간', '기본급', '연장수당', '주휴수당', '합계'];
  const rows = workers.map((w) => [
    w.worker_name,
    w.phone,
    w.regularHours,
    w.overtimeHours,
    w.regularWage,
    w.overtimeWage,
    w.weeklyHolidayBonus,
    w.totalWage,
  ]);

  const content = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
    ['합계', '', '', '', '', '', '', rows.reduce((sum, r) => sum + (typeof r[7] === 'number' ? r[7] : 0), 0)].join(','),
  ].join('\n');

  return content;
}

function downloadCSV(content: string, filename: string) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
