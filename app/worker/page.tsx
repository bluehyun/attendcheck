'use client';

import { useState, useRef } from 'react';
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
  const [step, setStep] = useState<'qr' | 'info' | 'confirm'>('qr');
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleQRUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 실제 구현에서는 QR 코드를 스캔하는 로직이 필요합니다
    // 여기서는 시뮬레이션을 위해 파일명을 사용합니다
    const fileName = file.name;
    
    // QR 코드에서 worker_id를 추출한다고 가정
    const workerId = fileName.replace('.png', '').replace('.jpg', '');
    
    // 근로자 정보 조회
    const { data: worker, error } = await supabase
      .from('workers')
      .select('*')
      .eq('qr_code', workerId)
      .single();

    if (error || !worker) {
      setMessage({ type: 'error', text: '등록되지 않은 QR 코드입니다.' });
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

    if (existingRecord) {
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
      setStep('qr');
      setCurrentRecord(null);
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
      setStep('qr');
      setCurrentRecord(null);
      setMessage(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-center mb-8 text-primary">출퇴근 체크</h1>

          {message && (
            <div className={`p-4 rounded-lg mb-6 ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          {step === 'qr' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-gray-600 mb-4">QR 코드를 스캔하거나 파일 선택</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full"
                >
                  파일 선택
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleQRUpload}
                />
              </div>
              <p className="text-center text-sm text-gray-500">
                이름과 전화번호는 QR 코드에서 자동으로 입력됩니다
              </p>
            </div>
          )}

          {step === 'confirm' && currentRecord && (
            <div className="space-y-6">
              {/* 근로자 정보 표시 */}
              <div className="bg-secondary rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">이름:</span>
                  <span className="font-semibold">{currentRecord.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">전화번호:</span>
                  <span className="font-semibold">{currentRecord.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">날짜:</span>
                  <span className="font-semibold">{currentRecord.check_date}</span>
                </div>
              </div>

              {/* 출근/퇴근 여부 표시 */}
              <div className="space-y-2">
                {currentRecord.check_in_time && (
                  <div className="flex items-center bg-green-100 p-3 rounded-lg">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-800">
                      출근: {new Date(currentRecord.check_in_time).toLocaleTimeString('ko-KR')}
                    </span>
                  </div>
                )}
                
                {currentRecord.check_out_time && (
                  <div className="flex items-center bg-blue-100 p-3 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-blue-800">
                      퇴근: {new Date(currentRecord.check_out_time).toLocaleTimeString('ko-KR')}
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
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                      출근
                    </button>
                    <button
                      onClick={() => {
                        setStep('qr');
                        setCurrentRecord(null);
                      }}
                      className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                    >
                      취소
                    </button>
                  </>
                ) : currentRecord.check_in_time && !currentRecord.check_out_time ? (
                  <>
                    <button
                      onClick={handleCheckOut}
                      className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      퇴근
                    </button>
                    <button
                      onClick={() => {
                        setStep('qr');
                        setCurrentRecord(null);
                      }}
                      className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4 bg-gray-100 rounded-lg">
                    <p className="text-gray-700 font-semibold">오늘 근무가 완료되었습니다</p>
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
