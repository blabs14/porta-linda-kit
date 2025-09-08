import React from 'react';
import { formatDateLocal, getWeekStart as getWeekStartUtil } from '@/lib/dateUtils';

export function useTimesheetWeekSchedule(initialWeekStart?: Date) {
  const initialMonday = React.useMemo(() => {
    const base = initialWeekStart ? new Date(initialWeekStart) : new Date();
    return getWeekStartUtil(base);
  }, [initialWeekStart]);

  const [selectedWeek, setSelectedWeek] = React.useState<string>(
    formatDateLocal(initialMonday)
  );

  const getWeekStart = React.useCallback((date: Date): Date => {
    return getWeekStartUtil(date);
  }, []);

  const getWeekNumber = React.useCallback((date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }, []);

  const weekDays = React.useMemo(() => {
    const [year, month, day] = selectedWeek.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const monday = getWeekStart(selectedDate);
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  }, [selectedWeek, getWeekStart]);

  const weekStartDate = weekDays[0];
  const weekEndDate = weekDays[6];

  return {
    selectedWeek,
    setSelectedWeek,
    weekDays,
    weekStartDate,
    weekEndDate,
    getWeekStart,
    getWeekNumber,
  } as const;
}