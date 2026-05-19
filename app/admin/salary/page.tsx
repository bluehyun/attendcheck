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

interface DailyWorkerRow {
  name: string;
  phone: string;
  regularHours: number;
  overtimeHours: number;
  regularWage: number;
  overtimeWage: number;
  totalWage: number;
}

interface DailyGroup {
  date: string;
  label: string;
  workers: DailyWorkerRow[];
  dayTotal: number;
}

// 주간 주휴수당 계산용 (전화번호별 주간 합산)
interface WeeklyWorker {
  regularHours: number;
  overtimeHours: number;
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
  const [dailyGroups, setDailyGroups] = useState<DailyGroup[]>([]);
  const [weeklyMap, setWeeklyMap] = useState<Map<string, WeeklyWorker>>(new Map());
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchWeeklySalaries(selectedWeek);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  const fetchWeeklySalaries = async (weekDate: Date) => {
    setLoading(true);

    const weekStart = getWeekStart(weekDate);
    const weekEnd = getWeekEnd(weekDate);
    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    const { data: records } = await supabase
      .from('attendance')
      .select('*')
      .gte('check_date', startStr)
      .lte('check_date', endStr)
      .order('check_date', { ascending: true });

    if (!records || records.length === 0) {
      setDailyGroups([]);
      setWeeklyMap(new Map());
      setLoading(false);
      return;
    }

    // 날짜별 그룹핑
    const dateMap = new Map<string, DailyWorkerRow[]>();
    // 주간 전화번호별 합산 (주휴수당 계산용)
    const phoneWeeklyMap = new Map<string, { regularHours: number; overtimeHours: number }>();

    for (const r of records) {
      if (!r.check_in_time || !r.check_out_time) continue;

      const hoursWorked = Math.floor(calculateWorkingHours(
        new Date(r.check_in_time),
        new Date(r.check_out_time)
      ));
      const regularHours = Math.min(hoursWorked, 8);
      const overtimeHours = Math.floor(Math.max(0, hoursWorked - 8));
      const regularWage = Math.floor(regularHours * HOURLY_RATE);
      const overtimeWage = Math.floor(overtimeHours * HOURLY_RATE * OVERTIME_MULTIPLIER);

      // 날짜별 추가
      if (!dateMap.has(r.check_date)) dateMap.set(r.check_date, []);
      dateMap.get(r.check_date)!.push({
        name: r.name,
        phone: r.phone,
        regularHours,
        overtimeHours,
        regularWage,
        overtimeWage,
        totalWage: regularWage + overtimeWage,
      });

      // 주간 합산
      if (!phoneWeeklyMap.has(r.phone)) phoneWeeklyMap.set(r.phone, { regularHours: 0, overtimeHours: 0 });
      const pw = phoneWeeklyMap.get(r.phone)!;
      pw.regularHours += regularHours;
      pw.overtimeHours += overtimeHours;
    }

    // 주간 주휴수당 계산
    const newWeeklyMap = new Map<string, WeeklyWorker>();
    for (const [phone, { regularHours, overtimeHours }] of phoneWeeklyMap) {
      const weeklyHolidayBonus =
        regularHours + overtimeHours >= WEEKLY_MINIMUM_HOURS ? WEEKLY_HOLIDAY_ALLOWANCE : 0;
      const regularWage = Math.floor(regularHours * HOURLY_RATE);
      const overtimeWage = Math.floor(overtimeHours * HOURLY_RATE * OVERTIME_MULTIPLIER);
      newWeeklyMap.set(phone, {
        regularHours,
        overtimeHours,
        weeklyHolidayBonus,
        totalWage: regularWage + overtimeWage + weeklyHolidayBonus,
      });
    }
    setWeeklyMap(newWeeklyMap);

    // 날짜 그룹 배열 생성
    const groups: DailyGroup[] = [];
    for (const [date, workers] of dateMap) {
      const label = formatDate(new Date(date + 'T00:00:00'));
      const dayTotal = workers.reduce((s, w) => s + w.totalWage, 0);
      groups.push({ date, label, workers, dayTotal });
    }
    groups.sort((a, b) => a.date.localeCompare(b.date));
    setDailyGroups(groups);
    setLoading(false);
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate);
  };

  const weekStart = getWeekStart(selectedWeek);
  const weekEnd = getWeekEnd(selectedWeek);

  // 요약 수치
  const totalWorkers = weeklyMap.size;
  const totalHours = Array.from(weeklyMap.values()).reduce(
    (s, w) => s + w.regularHours + w.overtimeHours, 0
  );
  const totalPayroll = Array.from(weeklyMap.values()).reduce((s, w) => s + w.totalWage, 0);

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

        {/* 주간 요약 카드 */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">근로자 수</div>
            <div className="text-3xl font-bold text-primary mt-2">{totalWorkers}명</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">총 근무시간</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{totalHours}h</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">총 급여 (주휴수당 포함)</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              ₩{totalPayroll.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 날짜별 테이블 */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center text-gray-500">
            로딩 중...
          </div>
        ) : dailyGroups.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center text-gray-500">
            해당 주간에 근무 기록이 없습니다
          </div>
        ) : (
          <div className="space-y-6">
            {dailyGroups.map((group) => (
              <div key={group.date} className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-bold text-black mb-4 pb-2 border-b border-gray-200">
                  📅 {group.label}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-black">이름</th>
                        <th className="px-4 py-3 text-left font-semibold text-black">전화번호</th>
                        <th className="px-4 py-3 text-right font-semibold text-black">정상 시간</th>
                        <th className="px-4 py-3 text-right font-semibold text-black">연장 시간</th>
                        <th className="px-4 py-3 text-right font-semibold text-black">기본급</th>
                        <th className="px-4 py-3 text-right font-semibold text-black">연장수당</th>
                        <th className="px-4 py-3 text-right font-semibold text-black">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.workers.map((w, idx) => (
                        <tr key={w.phone} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-medium text-gray-900">{w.name}</td>
                          <td className="px-4 py-3 text-gray-600">{w.phone}</td>
                          <td className="px-4 py-3 text-right text-gray-800">{w.regularHours}h</td>
                          <td className="px-4 py-3 text-right text-orange-600 font-semibold">
                            {w.overtimeHours > 0 ? `${w.overtimeHours}h` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-800">
                            ₩{w.regularWage.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600 font-semibold">
                            {w.overtimeWage > 0 ? `₩${w.overtimeWage.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-primary">
                            ₩{w.totalWage.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-300 bg-gray-50">
                        <td colSpan={6} className="px-4 py-3 font-bold text-gray-800">
                          일계
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          ₩{group.dayTotal.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* 주간 주휴수당 포함 최종 합계 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-bold text-black mb-4 pb-2 border-b border-gray-200">
                📋 주간 최종 급여 (주휴수당 포함)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-black">이름</th>
                      <th className="px-4 py-3 text-left font-semibold text-black">전화번호</th>
                      <th className="px-4 py-3 text-right font-semibold text-black">정상 시간</th>
                      <th className="px-4 py-3 text-right font-semibold text-black">연장 시간</th>
                      <th className="px-4 py-3 text-right font-semibold text-black">기본급</th>
                      <th className="px-4 py-3 text-right font-semibold text-black">연장수당</th>
                      <th className="px-4 py-3 text-right font-semibold text-black">주휴수당</th>
                      <th className="px-4 py-3 text-right font-semibold text-black">합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(weeklyMap.entries()).map(([phone, w], idx) => {
                      const name = dailyGroups
                        .flatMap((g) => g.workers)
                        .find((r) => r.phone === phone)?.name ?? '';
                      const regularWage = Math.floor(w.regularHours * HOURLY_RATE);
                      const overtimeWage = Math.floor(w.overtimeHours * HOURLY_RATE * OVERTIME_MULTIPLIER);
                      return (
                        <tr key={phone} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                          <td className="px-4 py-3 text-gray-600">{phone}</td>
                          <td className="px-4 py-3 text-right text-gray-800">{w.regularHours}h</td>
                          <td className="px-4 py-3 text-right text-orange-600 font-semibold">
                            {w.overtimeHours > 0 ? `${w.overtimeHours}h` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-800">
                            ₩{regularWage.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600 font-semibold">
                            {overtimeWage > 0 ? `₩${overtimeWage.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 font-semibold">
                            {w.weeklyHolidayBonus > 0
                              ? `₩${w.weeklyHolidayBonus.toLocaleString()}`
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-lg text-primary">
                            ₩{w.totalWage.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td colSpan={7} className="px-4 py-3 font-bold text-gray-800">합계</td>
                      <td className="px-4 py-3 text-right font-bold text-lg text-green-600">
                        ₩{totalPayroll.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => {
              const csv = generateCSV(dailyGroups, weeklyMap);
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

function generateCSV(
  dailyGroups: DailyGroup[],
  weeklyMap: Map<string, WeeklyWorker>
): string {
  const lines: string[] = [];

  // 날짜별
  for (const group of dailyGroups) {
    lines.push(`날짜,${group.label}`);
    lines.push('이름,전화번호,정상시간,연장시간,기본급,연장수당,합계');
    for (const w of group.workers) {
      lines.push([w.name, w.phone, w.regularHours, w.overtimeHours, w.regularWage, w.overtimeWage, w.totalWage].join(','));
    }
    lines.push(`일계,,,,,, ${group.dayTotal}`);
    lines.push('');
  }

  // 주간 합계
  lines.push('주간 최종 급여 (주휴수당 포함)');
  lines.push('이름,전화번호,정상시간,연장시간,기본급,연장수당,주휴수당,합계');
  for (const [phone, w] of weeklyMap) {
    const regularWage = Math.floor(w.regularHours * HOURLY_RATE);
    const overtimeWage = Math.floor(w.overtimeHours * HOURLY_RATE * OVERTIME_MULTIPLIER);
    const name = dailyGroups.flatMap((g) => g.workers).find((r) => r.phone === phone)?.name ?? '';
    lines.push([name, phone, w.regularHours, w.overtimeHours, regularWage, overtimeWage, w.weeklyHolidayBonus, w.totalWage].join(','));
  }

  return lines.join('\n');
}

function downloadCSV(content: string, filename: string) {
  // UTF-8 BOM 추가 → 윈도우 Excel에서 한글 깨짐 방지
  const bom = '﻿';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const element = document.createElement('a');
  element.setAttribute('href', url);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
}
