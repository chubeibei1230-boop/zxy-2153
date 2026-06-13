import type { TimelineNode } from '@/types';

export function parseTimeToMinutes(time: string): number {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function getEndTime(node: TimelineNode): string {
  const startMinutes = parseTimeToMinutes(node.startTime);
  const endMinutes = startMinutes + node.durationMinutes;
  return formatMinutesToTime(endMinutes);
}

export function getEndMinutes(node: TimelineNode): number {
  return parseTimeToMinutes(node.startTime) + node.durationMinutes;
}

export function isTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

export function getTimeGap(time1: string, time2: string): number {
  const t1 = parseTimeToMinutes(time1);
  const t2 = parseTimeToMinutes(time2);
  return Math.abs(t2 - t1);
}

export function addMinutesToTime(time: string, minutes: number): string {
  const totalMinutes = parseTimeToMinutes(time) + minutes;
  return formatMinutesToTime(totalMinutes);
}

export function isValidTimeFormat(time: string): boolean {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

export function getTimeDisplay(startTime: string, durationMinutes: number): string {
  const endTime = addMinutesToTime(startTime, durationMinutes);
  return `${startTime} - ${endTime}`;
}
