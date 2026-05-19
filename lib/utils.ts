// 시급 관련 상수
export const HOURLY_RATE = 10320; // 기본 시급
export const OVERTIME_MULTIPLIER = 1.5; // 연장근무 배수
export const WEEKLY_HOLIDAY_ALLOWANCE = 82560; // 주휴수당
export const WEEKLY_MINIMUM_HOURS = 15; // 주휴수당 최소 근무시간
export const LUNCH_TIME_HOURS = 1; // 점심시간 제외 시간

// 급여 계산 함수
export function calculateDailyWage(hours: number): number {
  return Math.round(HOURLY_RATE * hours);
}

export function calculateOvertimeWage(hours: number): number {
  return Math.round(HOURLY_RATE * OVERTIME_MULTIPLIER * hours);
}

export function calculateWeeklyWage(regularHours: number, overtimeHours: number): number {
  const regularWage = calculateDailyWage(regularHours);
  const overtimeWage = calculateOvertimeWage(overtimeHours);
  const weeklyHolidayBonus = regularHours >= WEEKLY_MINIMUM_HOURS ? WEEKLY_HOLIDAY_ALLOWANCE : 0;
  
  return regularWage + overtimeWage + weeklyHolidayBonus;
}

// 시간 계산 함수
// - 업무 시작은 오전 9시 기준 (일찍 출근해도 9시부터 카운트)
// - 퇴근 시간은 시간 단위 절사 (18:01 → 18:00)
// - 점심시간 1시간 제외
export function calculateWorkingHours(checkIn: Date, checkOut: Date): number {
  // 유효 시작: 실제 출근과 오전 9시 중 늦은 시각
  const nineAM = new Date(checkIn);
  nineAM.setHours(9, 0, 0, 0);
  const effectiveStart = checkIn < nineAM ? nineAM : checkIn;

  // 유효 종료: 분/초 절사 (시간 단위로만 인정)
  const effectiveEnd = new Date(checkOut);
  effectiveEnd.setMinutes(0, 0, 0);

  const diffHours = (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);
  const workingHours = Math.max(0, diffHours - LUNCH_TIME_HOURS);
  return workingHours;
}

// 날짜 포맷팅
export function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

// 주 시작/종료 날짜 계산
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}
