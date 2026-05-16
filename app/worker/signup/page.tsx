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
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
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
      setError('전화번호는 10-11자리 숫자여야 합니다');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // 전화번호 중복 체크
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
        });

      if (insertError) {
        setError('회원가입에 실패했습니다');
        return;
      }

      setSuccess('회원가입이 완료되었습니다!');
      setFormData({ name: '', phone: '' });

      // 2초 후 /worker 페이지로 이동
      setTimeout(() => {
        router.push('/worker');
      }, 1500);
    } catch (err) {
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-center mb-2 text-blue-600">근로자 가입</h1>
          <p className="text-center text-sm text-gray-600 mb-6">
            이름과 전화번호만 입력하면 가입 완료!
          </p>

          {error && (
            <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6 border border-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-6 border border-green-300">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '가입 중...' : '가입'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            이미 회원이신가요?{' '}
            <Link href="/worker" className="text-blue-600 font-semibold hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
