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
export function calculateWorkingHours(checkIn: Date, checkOut: Date): number {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const workingHours = Math.max(0, diffHours - LUNCH_TIME_HOURS);
  return Math.round(workingHours * 10) / 10;
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
