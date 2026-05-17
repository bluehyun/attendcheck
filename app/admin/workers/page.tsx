'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthGuard } from '@/components/AuthGuard';

interface Worker {
  id: string;
  name: string;
  phone: string;
  qr_code?: string;
  created_at: string;
}

export default function AdminWorkersPage() {
  return (
    <AuthGuard requiredRole="admin">
      <WorkersContent />
    </AuthGuard>
  );
}

function WorkersContent() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const supabase = createClient();

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    const { data } = await supabase.from('workers').select('*').order('created_at', { ascending: false });
    setWorkers(data || []);
    setLoading(false);
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      alert('이름과 전화번호를 입력하세요');
      return;
    }

    const { error } = await supabase.from('workers').insert({
      name: formData.name,
      phone: formData.phone,
      qr_code: `WORKER_${Date.now()}`,
    });

    if (error) {
      alert('근로자 추가에 실패했습니다');
      return;
    }

    setFormData({ name: '', phone: '' });
    setShowForm(false);
    fetchWorkers();
  };

  const handleDeleteWorker = async (id: string) => {
    if (!confirm('정말 이 근로자를 삭제하시겠습니까?')) return;

    const { error } = await supabase.from('workers').delete().eq('id', id);

    if (error) {
      alert('근로자 삭제에 실패했습니다');
      return;
    }

    fetchWorkers();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary">근로자 관리</h1>
          <Link href="/admin" className="text-primary hover:underline">
            대시보드로 →
          </Link>
        </div>

        {/* 근로자 추가 버튼 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {showForm ? '취소' : '+ 근로자 추가'}
          </button>

          {showForm && (
            <form onSubmit={handleAddWorker} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="근로자 이름"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="010-1234-5678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                추가
              </button>
            </form>
          )}
        </div>

        {/* 근로자 목록 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">등록된 근로자</h2>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">로딩 중...</p>
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">등록된 근로자가 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">이름</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      전화번호
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      QR 코드
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      등록일
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker, idx) => (
                    <tr key={worker.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">{worker.name}</td>
                      <td className="px-4 py-3 text-gray-600">{worker.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <code className="bg-gray-100 px-2 py-1 rounded">
                          {worker.qr_code || '-'}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(worker.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/workers/${worker.id}`}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                          >
                            이력 보기
                          </Link>
                          <button
                            onClick={() => handleDeleteWorker(worker.id)}
                            className="text-red-600 hover:text-red-800 font-semibold text-sm"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 주의사항 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>참고:</strong> 근로자를 추가하면 자동으로 QR 코드가 생성됩니다. 각 근로자는 이 QR 코드를 스캔하여 출퇴근을 등록합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
