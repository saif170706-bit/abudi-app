import pageData from '@/shared/page-data.json';
import surahData from '@/shared/surah-data.json';
import type { Assignment, AssignmentPart } from '@/shared/types';

export const TOTAL_PAGES = 604;
export const TOTAL_JUZ = 30;

const surahNameToNumberMap: Record<string, number> = {};
(surahData as any[]).forEach((s) => {
  surahNameToNumberMap[s.name] = s.number;
  surahNameToNumberMap[s.arabic] = s.number;
});

function parseVerseKey(key: string): { surah: number; ayah: number } {
  const [surah, ayah] = key.split(':').map(Number);
  return { surah, ayah };
}

export function getSurahNumber(name: string): number {
  return surahNameToNumberMap[name] || 0;
}

export function getJuzPageRange(juz: number): [number, number] {
  if (juz <= 1) return [1, 21];
  if (juz >= 30) return [582, 604];
  const start = (juz - 1) * 20 + 2;
  const end = juz * 20 + 1;
  return [start, end];
}

export function getAyahsInRange(part: AssignmentPart): string[] {
  const ayahs: string[] = [];
  if (!part.surahName || !part.fromAyah || !part.toAyah) return ayahs;

  const startNum = getSurahNumber(part.surahName);
  const endNum = part.endSurahName ? getSurahNumber(part.endSurahName) : startNum;

  if (!startNum || !endNum) return ayahs;

  if (startNum === endNum) {
    const min = Math.min(part.fromAyah, part.toAyah);
    const max = Math.max(part.fromAyah, part.toAyah);
    for (let i = min; i <= max; i++) ayahs.push(`${startNum}:${i}`);
  } else {
    const minS = Math.min(startNum, endNum);
    const maxS = Math.max(startNum, endNum);

    for (let s = minS; s <= maxS; s++) {
      const sInfo = (surahData as any[]).find((sd) => sd.number === s);
      if (!sInfo) continue;
      const verses = sInfo.verses;

      let startA = 1;
      let endA = verses;
      if (s === startNum) startA = part.fromAyah;
      if (s === endNum) endA = part.toAyah;

      const currentMin = Math.min(startA, endA);
      const currentMax = Math.max(startA, endA);
      for (let a = currentMin; a <= currentMax; a++) ayahs.push(`${s}:${a}`);
    }
  }
  return ayahs;
}

export function calculateGradedAyahs(assignments: Assignment[]): Set<string> {
  const gradedAyahs = new Set<string>();
  assignments.forEach((a) => {
    if (a.gradeHifz && a.gradeHifz !== 'Ikke læst') {
      getAyahsInRange(a.hifz).forEach((key) => gradedAyahs.add(key));
    }
  });
  return gradedAyahs;
}

export function calculateCompletedPages(assignments: Assignment[]): Set<number> {
  const gradedAyahs = calculateGradedAyahs(assignments);
  const completedPages = new Set<number>();

  for (const pageStr in pageData) {
    const page = parseInt(pageStr, 10);
    const info = (pageData as any)[pageStr];
    const start = parseVerseKey(info.start);
    const end = parseVerseKey(info.end);

    let allDone = true;

    if (start.surah === end.surah) {
      for (let a = start.ayah; a <= end.ayah; a++) {
        if (!gradedAyahs.has(`${start.surah}:${a}`)) {
          allDone = false;
          break;
        }
      }
    } else {
      const firstSurahVerses = (surahData as any[]).find((s) => s.number === start.surah)?.verses || 0;
      for (let a = start.ayah; a <= firstSurahVerses; a++) {
        if (!gradedAyahs.has(`${start.surah}:${a}`)) {
          allDone = false;
          break;
        }
      }
      if (allDone) {
        for (let s = start.surah + 1; s < end.surah; s++) {
          const verses = (surahData as any[]).find((x) => x.number === s)?.verses || 0;
          for (let a = 1; a <= verses; a++) {
            if (!gradedAyahs.has(`${s}:${a}`)) {
              allDone = false;
              break;
            }
          }
          if (!allDone) break;
        }
      }
      if (allDone) {
        for (let a = 1; a <= end.ayah; a++) {
          if (!gradedAyahs.has(`${end.surah}:${a}`)) {
            allDone = false;
            break;
          }
        }
      }
    }

    if (allDone) completedPages.add(page);
  }

  return completedPages;
}

export function calculateCompletedSurahs(assignments: Assignment[]): Set<number> {
  const gradedAyahs = calculateGradedAyahs(assignments);
  const completedSurahs = new Set<number>();

  (surahData as any[]).forEach((s) => {
    let allDone = true;
    for (let i = 1; i <= s.verses; i++) {
      if (!gradedAyahs.has(`${s.number}:${i}`)) {
        allDone = false;
        break;
      }
    }
    if (allDone) completedSurahs.add(s.number);
  });

  return completedSurahs;
}

export function calculateCompletedJuz(assignments: Assignment[]): Set<number> {
  const completedPages = calculateCompletedPages(assignments);
  const completedJuz = new Set<number>();

  for (let j = 1; j <= 30; j++) {
    const [start, end] = getJuzPageRange(j);
    let allDone = true;
    for (let p = start; p <= end; p++) {
      if (!completedPages.has(p)) {
        allDone = false;
        break;
      }
    }
    if (allDone) completedJuz.add(j);
  }

  return completedJuz;
}

export interface ForecastResult {
  completedPages: number;
  actualPace4Weeks: number; // pages per day in last 4 weeks
  daysRemaining: number;
  estimatedFinishDate: Date | null;
  targetFinishDate: Date | null;
  diffDays: number;
  status: 'ahead' | 'on-track' | 'behind';
  percentAheadBehind: number;
  startDate: Date | null;
}

export function calculateHistory(assignments: Assignment[]) {
  const assignmentsByDay: Record<string, Assignment[]> = {};
  assignments.forEach((a) => {
    if (a.gradeHifz && a.gradeHifz !== 'Ikke læst' && (a.gradedAt || a.assignedAt)) {
      const raw = a.gradedAt || a.assignedAt;
      const dateObj = raw?.toDate ? raw.toDate() : new Date(raw);
      const dateStr = dateObj.toISOString().split('T')[0];
      if (!assignmentsByDay[dateStr]) assignmentsByDay[dateStr] = [];
      assignmentsByDay[dateStr].push(a);
    }
  });

  const sortedDays = Object.keys(assignmentsByDay).sort();
  const cumulativeAssignments: Assignment[] = [];
  const history: { date: string; pages: number }[] = [];

  sortedDays.forEach((dayStr) => {
    cumulativeAssignments.push(...assignmentsByDay[dayStr]);
    history.push({ date: dayStr, pages: calculateCompletedPages(cumulativeAssignments).size });
  });

  return history;
}

export function calculateForecast(assignments: Assignment[], courseDuration: string): ForecastResult {
  const sortedAssignments = [...assignments]
    .filter((a) => a.gradeHifz && a.gradeHifz !== 'Ikke læst' && (a.gradedAt || a.assignedAt))
    .sort((a, b) => {
      const rawA = a.gradedAt || a.assignedAt;
      const rawB = b.gradedAt || b.assignedAt;
      const da = rawA?.toDate ? rawA.toDate().getTime() : new Date(rawA).getTime();
      const db = rawB?.toDate ? rawB.toDate().getTime() : new Date(rawB).getTime();
      return da - db;
    });

  const firstGradedAt =
    sortedAssignments.length > 0
      ? (() => {
          const raw = sortedAssignments[0].gradedAt || sortedAssignments[0].assignedAt;
          return raw?.toDate ? raw.toDate() : new Date(raw);
        })()
      : null;

  const completedPages = calculateCompletedPages(assignments).size;
  const today = new Date();

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(today.getDate() - 28);

  const recentAssignments = assignments.filter((a) => {
    if (!a.gradeHifz || a.gradeHifz === 'Ikke læst' || (!a.gradedAt && !a.assignedAt)) return false;
    const raw = a.gradedAt || a.assignedAt;
    const d = raw?.toDate ? raw.toDate() : new Date(raw);
    return d >= fourWeeksAgo;
  });
  void recentAssignments;

  const oldAssignments = assignments.filter((a) => {
    if (!a.gradeHifz || a.gradeHifz === 'Ikke læst' || (!a.gradedAt && !a.assignedAt)) return false;
    const raw = a.gradedAt || a.assignedAt;
    const d = raw?.toDate ? raw.toDate() : new Date(raw);
    return d < fourWeeksAgo;
  });

  const pagesBefore4Weeks = calculateCompletedPages(oldAssignments).size;
  const pagesCompletedRecent = completedPages - pagesBefore4Weeks;
  const pace4WeeksEachDay = pagesCompletedRecent / 28;

  let targetFinishDate: Date | null = null;
  let percentAheadBehind = 0;
  if (firstGradedAt) {
    const durationYears = parseFloat(courseDuration) || 3;
    targetFinishDate = new Date(firstGradedAt);
    targetFinishDate.setFullYear(targetFinishDate.getFullYear() + Math.floor(durationYears));
    targetFinishDate.setMonth(targetFinishDate.getMonth() + Math.floor((durationYears % 1) * 12));

    const totalDaysProjected = (targetFinishDate.getTime() - firstGradedAt.getTime()) / (1000 * 60 * 60 * 24);
    const daysPassed = (today.getTime() - firstGradedAt.getTime()) / (1000 * 60 * 60 * 24);
    const expectedPagesNow = (daysPassed / totalDaysProjected) * TOTAL_PAGES;
    percentAheadBehind = ((completedPages - expectedPagesNow) / TOTAL_PAGES) * 100;
  }

  if (pace4WeeksEachDay <= 0 || !firstGradedAt) {
    return {
      completedPages,
      actualPace4Weeks: pace4WeeksEachDay,
      daysRemaining: Infinity,
      estimatedFinishDate: null,
      targetFinishDate,
      diffDays: 0,
      status: 'on-track',
      percentAheadBehind,
      startDate: firstGradedAt,
    };
  }

  const remainingPages = TOTAL_PAGES - completedPages;
  const daysRemaining = Math.round(remainingPages / pace4WeeksEachDay);
  const estimatedFinishDate = new Date();
  estimatedFinishDate.setDate(estimatedFinishDate.getDate() + daysRemaining);

  const diffDays = targetFinishDate
    ? Math.round((estimatedFinishDate.getTime() - targetFinishDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const status: ForecastResult['status'] = diffDays < -7 ? 'ahead' : diffDays > 7 ? 'behind' : 'on-track';

  return {
    completedPages,
    actualPace4Weeks: pace4WeeksEachDay,
    daysRemaining,
    estimatedFinishDate,
    targetFinishDate,
    diffDays,
    status,
    percentAheadBehind,
    startDate: firstGradedAt,
  };
}

export function calculateStreakPoints(assignments: Assignment[]): number {
  const graded = assignments.filter((a) => a.gradeHifz && a.gradeHifz !== 'Ikke læst' && (a.gradedAt || a.assignedAt));
  if (graded.length === 0) return 0;

  const weeks: Record<string, number> = {};
  graded.forEach((a) => {
    const raw = a.gradedAt || a.assignedAt;
    const d = raw?.toDate ? raw.toDate() : new Date(raw);
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
    const key = `${d.getFullYear()}-${weekNum}`;
    weeks[key] = (weeks[key] || 0) + 1;
  });

  const sortedWeeks = Object.keys(weeks).sort();

  const today = new Date();
  const oneJan = new Date(today.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((today.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const currentWeekNum = Math.ceil((today.getDay() + 1 + numberOfDays) / 7);
  const currentWeekKey = `${today.getFullYear()}-${currentWeekNum}`;

  let runningStreakPoints = 0;

  const startWeekStr = sortedWeeks[0];
  const [startYear, startWN] = startWeekStr.split('-').map(Number);

  let tempDate = new Date(startYear, 0, 1);
  tempDate.setDate(tempDate.getDate() + (startWN - 1) * 7);

  while (true) {
    const ty = tempDate.getFullYear();
    const tJan = new Date(ty, 0, 1);
    const tDays = Math.floor((tempDate.getTime() - tJan.getTime()) / (24 * 60 * 60 * 1000));
    const tW = Math.ceil((tempDate.getDay() + 1 + tDays) / 7);
    const key = `${ty}-${tW}`;

    const sessions = weeks[key] || 0;
    if (sessions > 0) {
      const pts = sessions === 1 ? 1 : sessions === 2 ? 1.75 : 2;
      runningStreakPoints += pts;
    } else {
      runningStreakPoints = 0;
    }

    if (key === currentWeekKey) break;
    tempDate.setDate(tempDate.getDate() + 7);
    if (tempDate > new Date(today.getTime() + 7 * 86400000)) break;
  }

  return parseFloat(runningStreakPoints.toFixed(2));
}
