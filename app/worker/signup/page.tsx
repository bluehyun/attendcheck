'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function WorkerSignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    passwordConfirm: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // 비밀번호와 비밀번호 확인 필드는 숫자만 입력받기
    if ((name === 'password' || name === 'passwordConfirm') && value && !/^\d*$/.test(value)) {
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('이름을 입력해주세요');
      return false;
    }

    if (!formData.phone.trim()) {
      setError('전화번호를 입력해주세요');
      return false;
    }

    if (!/^\d{10,11}$/.test(formData.phone)) {
      setError('유효한 전화번호를 입력해주세요');
      return false;
    }

    if (!formData.password) {
      setError('비밀번호를 입력해주세요');
      return false;
    }

    if (!/^\d{4}$/.test(formData.password)) {
      setError('비밀번호는 숫자 4자리여야 합니다');
      return false;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다');
      return false;
    }

    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // 같은 전화번호의 근로자가 이미 있는지 확인
      const { data: existingWorker } = await supabase
        .from('workers')
        .select('*')
        .eq('phone', formData.phone)
        .single();

      if (existingWorker) {
        setError('이미 등록된 전화번호입니다');
        setLoading(false);
        return;
      }

      // 새로운 근로자 등록
      const { error: insertError } = await supabase
        .from('workers')
        .insert({
          name: formData.name,
          phone: formData.phone,
          password: formData.password,
        });

      if (insertError) {
        setError('회원가입에 실패했습니다');
        setLoading(false);
        return;
      }

      // 성공 메시지 및 리다이렉트
      alert('회원가입이 완료되었습니다!');
      router.push('/worker');
    } catch (err) {
      setError('오류가 발생했습니다');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-center mb-2 text-blue-600">
            근로자 회원가입
          </h1>
          <p className="text-center text-gray-600 text-sm mb-6">
            출퇴근 체크를 위해 가입해주세요
          </p>

          {error && (
            <div className="bg-red-100 text-red-800 p-3 rounded-lg mb-6 border border-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* 이름 입력 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                이름
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="이름을 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black"
              />
            </div>

            {/* 전화번호 입력 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                전화번호
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="01012345678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black"
              />
              <p className="text-xs text-gray-500 mt-1">숫자만 입력해주세요 (10-11자리)</p>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="숫자 4자리"
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black"
              />
              <p className="text-xs text-gray-500 mt-1">숫자 4자리만 가능합니다</p>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                비밀번호 확인
              </label>
              <input
                type="password"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleInputChange}
                placeholder="숫자 4자리"
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black"
              />
            </div>

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 mt-6"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          {/* 이미 계정이 있다면 */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              이미 계정이 있으신가요?{' '}
              <Link href="/worker" className="text-blue-600 font-semibold hover:underline">
                출퇴근 하기
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
