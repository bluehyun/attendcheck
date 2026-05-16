'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const HOURLY_RATE = 10320;
const LUNCH_TIME_HOURS = 1; // 점심시간 1시간
const OVERTIME_MULTIPLIER = 1.5;

interface AttendanceRecord {
  worker_id: string;
  name: string;
  phone: string;
  check_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
}

interface DailySalary {
  baseSalary: number;
  overtimeSalary: number;
  totalSalary: number;
  workingHours: number;
}

export default function WorkerPage() {
  const [step, setStep] = useState<'input' | 'choice' | 'result'>('input');
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [dailySalary, setDailySalary] = useState<DailySalary | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supabase = createClient();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConfirm = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      setMessage({ type: 'error', text: '이름과 전화번호를 입력해주세요.' });
      return;
    }

    // 오늘의 기록 조회
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRecord } = await supabase
      .from('attendance')
      .select('*')
      .eq('phone', formData.phone)
      .eq('check_date', today)
      .single();

    setCurrentRecord({
      worker_id: '',
      name: formData.name,
      phone: formData.phone,
      check_date: today,
      check_in_time: todayRecord?.check_in_time || null,
      check_out_time: todayRecord?.check_out_time || null,
    });

    setStep('choice');
  };

  const calculateDailySalary = (checkInTime: string, checkOutTime: string): DailySalary => {
    const checkIn = new Date(checkInTime);
    const checkOut = new Date(checkOutTime);
    
    // 근무시간 계산 (분 단위)
    const totalMinutes = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);
    const totalHours = totalMinutes / 60;
    
    // 점심시간 제외
    const workingHours = Math.max(0, totalHours - LUNCH_TIME_HOURS);
    
    // 기본 근무시간 (8시간 기준)
    const baseHours = Math.min(workingHours, 8);
    const overtimeHours = Math.max(0, workingHours - 8);
    
    const baseSalary = Math.floor(baseHours * HOURLY_RATE);
    const overtimeSalary = Math.floor(overtimeHours * HOURLY_RATE * OVERTIME_MULTIPLIER);
    const totalSalary = baseSalary + overtimeSalary;

    return {
      baseSalary,
      overtimeSalary,
      totalSalary,
      workingHours: Math.round(workingHours * 10) / 10,
    };
  };

  const handleCheckIn = async () => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    try {
      // 기존 기록 확인
      const { data: existingRecord } = await supabase
        .from('attendance')
        .select('*')
        .eq('phone', formData.phone)
        .eq('check_date', today)
        .single();

      if (existingRecord) {
        // 기록이 있으면 업데이트
        if (existingRecord.check_in_time) {
          setMessage({ type: 'error', text: '이미 출근 기록이 있습니다.' });
          return;
        }
        
        await supabase
          .from('attendance')
          .update({ check_in_time: now })
          .eq('id', existingRecord.id);
      } else {
        // 새로운 기록 생성
        await supabase.from('attendance').insert({
          phone: formData.phone,
          name: formData.name,
          check_date: today,
          check_in_time: now,
        });
      }

      setMessage({
        type: 'success',
        text: `${formData.name}님이 ${new Date(now).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}에 출근했습니다.`,
      });

      setCurrentRecord((prev) => ({
        ...prev!,
        check_in_time: now,
      }));

      setTimeout(() => {
        setStep('input');
        setFormData({ name: '', phone: '' });
        setCurrentRecord(null);
        setMessage(null);
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: '출근 등록에 실패했습니다.' });
    }
  };

  const handleCheckOut = async () => {
    if (!currentRecord?.check_in_time) {
      setMessage({ type: 'error', text: '출근 기록이 없습니다.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    try {
      const { data: existingRecord } = await supabase
        .from('attendance')
        .select('*')
        .eq('phone', formData.phone)
        .eq('check_date', today)
        .single();

      if (existingRecord?.check_out_time) {
        setMessage({ type: 'error', text: '이미 퇴근 기록이 있습니다.' });
        return;
      }

      // 퇴근 기록 업데이트
      await supabase
        .from('attendance')
        .update({ check_out_time: now })
        .eq('phone', formData.phone)
        .eq('check_date', today);

      // 급여 계산
      const salary = calculateDailySalary(
        currentRecord.check_in_time,
        now
      );
      setDailySalary(salary);

      setMessage({
        type: 'success',
        text: `${formData.name}님이 ${new Date(now).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}에 퇴근했습니다.`,
      });

      setCurrentRecord((prev) => ({
        ...prev!,
        check_out_time: now,
      }));

      setStep('result');
    } catch (error) {
      setMessage({ type: 'error', text: '퇴근 등록에 실패했습니다.' });
    }
  };

  const handleReset = () => {
    setStep('input');
    setFormData({ name: '', phone: '' });
    setCurrentRecord(null);
    setDailySalary(null);
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-center mb-2 text-blue-600">출퇴근 관리</h1>

          {step === 'input' && (
            <p className="text-center text-sm text-gray-600 mb-6">
              아직 회원이 아니신가요?{' '}
              <Link href="/worker/signup" className="text-blue-600 font-semibold hover:underline">
                회원가입
              </Link>
            </p>
          )}

          {message && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 정보 입력 단계 */}
          {step === 'input' && (
            <div className="space-y-4">
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
              </div>

              <button
                onClick={handleConfirm}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </div>
          )}

          {/* 출근/퇴근 선택 단계 */}
          {step === 'choice' && currentRecord && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 space-y-2 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">이름:</span>
                  <span className="text-gray-900 font-bold">{currentRecord.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">전화번호:</span>
                  <span className="text-gray-900 font-semibold">{currentRecord.phone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">날짜:</span>
                  <span className="text-gray-900 font-semibold">{currentRecord.check_date}</span>
                </div>
              </div>

              {/* 상태 표시 */}
              <div className="space-y-2">
                {currentRecord.check_in_time && (
                  <div className="flex items-center bg-green-100 p-3 rounded-lg border border-green-300">
                    <span className="text-green-800 font-semibold">
                      출근: {new Date(currentRecord.check_in_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                {currentRecord.check_out_time && (
                  <div className="flex items-center bg-purple-100 p-3 rounded-lg border border-purple-300">
                    <span className="text-purple-800 font-semibold">
                      퇴근: {new Date(currentRecord.check_out_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>

              {/* 버튼 */}
              <div className="space-y-3">
                {!currentRecord.check_in_time ? (
                  <>
                    <button
                      onClick={handleCheckIn}
                      className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors"
                    >
                      출근
                    </button>
                    <button
                      onClick={handleReset}
                      className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                    >
                      돌아가기
                    </button>
                  </>
                ) : !currentRecord.check_out_time ? (
                  <>
                    <button
                      onClick={handleCheckOut}
                      className="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors"
                    >
                      퇴근
                    </button>
                    <button
                      onClick={handleReset}
                      className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                    >
                      돌아가기
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleReset}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    처음으로
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 결과 단계 - 급여 계산 표시 */}
          {step === 'result' && currentRecord && dailySalary && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 space-y-2 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">이름:</span>
                  <span className="text-gray-900 font-bold">{currentRecord.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">날짜:</span>
                  <span className="text-gray-900 font-semibold">{currentRecord.check_date}</span>
                </div>
              </div>

              {/* 근무 시간 */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                <h3 className="font-bold text-gray-800 text-lg">근무 현황</h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">출근:</span>
                  <span className="text-gray-900 font-semibold">
                    {currentRecord.check_in_time && new Date(currentRecord.check_in_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">퇴근:</span>
                  <span className="text-gray-900 font-semibold">
                    {currentRecord.check_out_time && new Date(currentRecord.check_out_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
                  <span className="text-gray-700 font-semibold">근무시간:</span>
                  <span className="text-gray-900 font-bold text-lg">{dailySalary.workingHours}시간</span>
                </div>
              </div>

              {/* 급여 계산 */}
              <div className="bg-green-50 rounded-lg p-4 space-y-3 border border-green-200">
                <h3 className="font-bold text-gray-800 text-lg">금일 급여</h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">기본급 (시급 {HOURLY_RATE.toLocaleString()}원):</span>
                  <span className="text-gray-900 font-semibold">{dailySalary.baseSalary.toLocaleString()}원</span>
                </div>
                {dailySalary.overtimeSalary > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">연장근무 수당 (1.5배):</span>
                    <span className="text-gray-900 font-semibold">{dailySalary.overtimeSalary.toLocaleString()}원</span>
                  </div>
                )}
                <div className="border-t border-green-300 pt-3 flex justify-between items-center bg-green-100 p-3 rounded">
                  <span className="text-gray-900 font-bold text-lg">총 급여:</span>
                  <span className="text-green-700 font-bold text-xl">{dailySalary.totalSalary.toLocaleString()}원</span>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                처음으로
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
