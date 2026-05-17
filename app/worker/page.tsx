'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HOURLY_RATE, LUNCH_TIME_HOURS, OVERTIME_MULTIPLIER } from '@/lib/utils';

interface DailySalary {
  baseSalary: number;
  overtimeSalary: number;
  totalSalary: number;
  workingHours: number;
  checkInTime: string;
  checkOutTime: string;
}

export default function WorkerPage() {
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [dailySalary, setDailySalary] = useState<DailySalary | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState<'checkin' | 'checkout' | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      setMessage({ type: 'error', text: '이름과 전화번호를 입력해주세요.' });
      return false;
    }
    return true;
  };

  const calculateDailySalary = (checkInTime: string, checkOutTime: string): DailySalary => {
    const checkIn = new Date(checkInTime);
    const checkOut = new Date(checkOutTime);
    const totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    const workingHours = Math.max(0, totalHours - LUNCH_TIME_HOURS);
    const baseHours = Math.min(workingHours, 8);
    const overtimeHours = Math.max(0, workingHours - 8);
    const baseSalary = Math.floor(baseHours * HOURLY_RATE);
    const overtimeSalary = Math.floor(overtimeHours * HOURLY_RATE * OVERTIME_MULTIPLIER);

    return {
      baseSalary,
      overtimeSalary,
      totalSalary: baseSalary + overtimeSalary,
      workingHours: Math.round(workingHours * 10) / 10,
      checkInTime,
      checkOutTime,
    };
  };

  const handleCheckIn = async () => {
    if (!validate()) return;
    setMessage(null);
    setLoading('checkin');

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkin', phone: formData.phone, name: formData.name }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? '출근 등록에 실패했습니다.' });
        return;
      }

      setMessage({
        type: 'success',
        text: `${formData.name}님 ${new Date(data.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 출근 완료`,
      });
      setFormData({ name: '', phone: '' });
    } catch {
      setMessage({ type: 'error', text: '출근 등록에 실패했습니다. 관리자에게 문의하세요.' });
    } finally {
      setLoading(null);
    }
  };

  const handleCheckOut = async () => {
    if (!validate()) return;
    setMessage(null);
    setLoading('checkout');

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', phone: formData.phone, name: formData.name }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? '퇴근 등록에 실패했습니다.' });
        return;
      }

      setDailySalary(calculateDailySalary(data.check_in_time, data.time));
      setFormData({ name: '', phone: '' });
    } catch {
      setMessage({ type: 'error', text: '퇴근 등록에 실패했습니다. 관리자에게 문의하세요.' });
    } finally {
      setLoading(null);
    }
  };

  const handleReset = () => {
    setDailySalary(null);
    setMessage(null);
  };

  if (dailySalary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 space-y-6">
          <h1 className="text-3xl font-bold text-center text-blue-600">퇴근 완료</h1>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
            <h3 className="font-bold text-black text-lg">근무 현황</h3>
            <div className="flex justify-between">
              <span className="text-black">출근</span>
              <span className="font-semibold text-black">{new Date(dailySalary.checkInTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">퇴근</span>
              <span className="font-semibold text-black">{new Date(dailySalary.checkOutTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="border-t border-gray-300 pt-3 flex justify-between">
              <span className="font-semibold text-black">근무시간</span>
              <span className="font-bold text-black text-lg">{dailySalary.workingHours}시간</span>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 space-y-3 border border-green-200">
            <h3 className="font-bold text-black text-lg">금일 급여</h3>
            <div className="flex justify-between">
              <span className="text-black">기본급 (시급 {HOURLY_RATE.toLocaleString()}원)</span>
              <span className="font-semibold text-black">{dailySalary.baseSalary.toLocaleString()}원</span>
            </div>
            {dailySalary.overtimeSalary > 0 && (
              <div className="flex justify-between">
                <span className="text-black">연장수당 (1.5배)</span>
                <span className="font-semibold text-black">{dailySalary.overtimeSalary.toLocaleString()}원</span>
              </div>
            )}
            <div className="border-t border-green-300 pt-3 flex justify-between bg-green-100 p-3 rounded">
              <span className="font-bold text-black text-lg">총 급여</span>
              <span className="font-bold text-black text-xl">{dailySalary.totalSalary.toLocaleString()}원</span>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            처음으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-2 text-blue-600">출퇴근 관리</h1>
        <p className="text-center text-sm text-gray-600 mb-6">
          아직 회원이 아니신가요?{' '}
          <Link href="/worker/signup" className="text-blue-600 font-semibold hover:underline">
            회원가입
          </Link>
        </p>

        {message && (
          <div className={`p-4 rounded-lg mb-6 border ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border-green-300'
              : 'bg-red-100 text-red-800 border-red-300'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">이름</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">전화번호</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="전화번호를 입력하세요 (예: 01012345678)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleCheckIn}
              disabled={loading !== null}
              className="bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading === 'checkin' ? '처리 중...' : '출근'}
            </button>
            <button
              onClick={handleCheckOut}
              disabled={loading !== null}
              className="bg-red-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading === 'checkout' ? '처리 중...' : '퇴근'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
