'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils';

interface AttendanceRecord {
  worker_id: string;
  name: string;
  phone: string;
  check_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
}

export default function QRCheckPage() {
  const [step, setStep] = useState<'info' | 'confirm'>('info');
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supabase = createClient();

  // 폼 데이터 입력
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 근로자 정보로 확인 및 오늘 기록 조회
  const handleInfoSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      setMessage({ type: 'error', text: '이름과 전화번호를 입력해주세요.' });
      return;
    }

    // 전화번호로 근로자 검색
    const { data: worker, error } = await supabase
      .from('workers')
      .select('*')
      .eq('phone', formData.phone)
      .single();

    if (error || !worker) {
      setMessage({ type: 'error', text: '등록되지 않은 전화번호입니다.' });
      return;
    }

    // 입력한 이름과 DB의 이름이 일치하는지 확인
    if (worker.name !== formData.name) {
      setMessage({ type: 'error', text: '입력하신 이름이 일치하지 않습니다.' });
      return;
    }

    setCurrentRecord({
      worker_id: worker.id,
      name: worker.name,
      phone: worker.phone,
      check_date: new Date().toISOString().split('T')[0],
      check_in_time: null,
      check_out_time: null,
    });

    // 오늘의 기록 확인
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRecord } = await supabase
      .from('attendance')
      .select('*')
      .eq('worker_id', worker.id)
      .eq('check_date', today)
      .single();

    if (todayRecord) {
      setCurrentRecord((prev) => ({
        ...prev!,
        check_in_time: todayRecord.check_in_time,
        check_out_time: todayRecord.check_out_time,
      }));
    }

    setStep('confirm');
  };

  const handleCheckIn = async () => {
    if (!currentRecord) return;

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const { data: existingRecord } = await supabase
      .from('attendance')
      .select('*')
      .eq('worker_id', currentRecord.worker_id)
      .eq('check_date', today)
      .single();

    if (existingRecord && existingRecord.check_in_time) {
      setMessage({ type: 'error', text: '이미 출근 기록이 있습니다.' });
      return;
    }

    const { error } = await supabase.from('attendance').insert({
      worker_id: currentRecord.worker_id,
      check_date: today,
      check_in_time: now,
    });

    if (error) {
      setMessage({ type: 'error', text: '출근 등록에 실패했습니다.' });
      return;
    }

    setMessage({ 
      type: 'success', 
      text: `${currentRecord.name}님이 ${formatDateTime(new Date())}에 출근했습니다.` 
    });
    
    setTimeout(() => {
      setStep('info');
      setCurrentRecord(null);
      setFormData({ name: '', phone: '' });
      setMessage(null);
    }, 3000);
  };

  const handleCheckOut = async () => {
    if (!currentRecord) return;

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('attendance')
      .update({ check_out_time: now })
      .eq('worker_id', currentRecord.worker_id)
      .eq('check_date', today);

    if (error) {
      setMessage({ type: 'error', text: '퇴근 등록에 실패했습니다.' });
      return;
    }

    setMessage({ 
      type: 'success', 
      text: `${currentRecord.name}님이 ${formatDateTime(new Date())}에 퇴근했습니다.` 
    });
    
    setTimeout(() => {
      setStep('info');
      setCurrentRecord(null);
      setFormData({ name: '', phone: '' });
      setMessage(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">출퇴근 체크</h1>

          {message && (
            <div className={`p-4 rounded-lg mb-6 ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}>
              {message.text}
            </div>
          )}

          {/* 정보 입력 단계 */}
          {step === 'info' && (
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <button
                  onClick={handleInfoSubmit}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  확인
                </button>
                <button
                  onClick={() => {
                    setFormData({ name: '', phone: '' });
                    setMessage(null);
                  }}
                  className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                >
                  초기화
                </button>
              </div>
            </div>
          )}

          {/* 확인 및 출퇴근 버튼 단계 */}
          {step === 'confirm' && currentRecord && (
            <div className="space-y-6">
              {/* 근로자 정보 표시 */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-3 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">이름:</span>
                  <span className="text-gray-900 font-bold text-lg">{currentRecord.name}</span>
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

              {/* 출근/퇴근 여부 표시 */}
              <div className="space-y-2">
                {currentRecord.check_in_time && (
                  <div className="flex items-center bg-green-100 p-3 rounded-lg border border-green-300">
                    <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-800 font-semibold">
                      출근: {new Date(currentRecord.check_in_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                
                {currentRecord.check_out_time && (
                  <div className="flex items-center bg-blue-100 p-3 rounded-lg border border-blue-300">
                    <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-blue-800 font-semibold">
                      퇴근: {new Date(currentRecord.check_out_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>

              {/* 버튼 */}
              <div className="space-y-3 pt-4">
                {!currentRecord.check_in_time ? (
                  <>
                    <button
                      onClick={handleCheckIn}
                      className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors shadow-md"
                    >
                      출근
                    </button>
                    <button
                      onClick={() => {
                        setStep('info');
                        setCurrentRecord(null);
                        setFormData({ name: '', phone: '' });
                      }}
                      className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                    >
                      다시 입력
                    </button>
                  </>
                ) : currentRecord.check_in_time && !currentRecord.check_out_time ? (
                  <>
                    <button
                      onClick={handleCheckOut}
                      className="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors shadow-md"
                    >
                      퇴근
                    </button>
                    <button
                      onClick={() => {
                        setStep('info');
                        setCurrentRecord(null);
                        setFormData({ name: '', phone: '' });
                      }}
                      className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                    >
                      다시 입력
                    </button>
                  </>
                ) : (
                  <div className="text-center py-6 bg-gray-100 rounded-lg border-2 border-gray-300">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-700 font-bold text-lg">오늘 근무가 완료되었습니다</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
