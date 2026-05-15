'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            일용직 근태 관리 시스템
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            QR 코드로 간편한 출퇴근 관리, 급여 확인까지 한 번에
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 근로자 섹션 */}
          <Link href="/worker">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow cursor-pointer h-full">
              <div className="mb-6">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-center mb-4">근로자</h2>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                  출퇴근 QR 스캔
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                  출퇴근 현황 조회
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                  급여 확인
                </li>
              </ul>
              <div className="text-center">
                <span className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                  로그인
                </span>
              </div>
            </div>
          </Link>

          {/* 관리자 섹션 */}
          <Link href="/admin">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow cursor-pointer h-full">
              <div className="mb-6">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-center mb-4">관리자</h2>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                  일별 출퇴근 현황
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                  개인별 급여 관리
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-accent rounded-full mr-3"></span>
                  통계 분석
                </li>
              </ul>
              <div className="text-center">
                <span className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                  로그인
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
