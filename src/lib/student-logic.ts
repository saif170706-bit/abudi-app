
import pageData from './page-data.json';
import surahData from './surah-data.json';
import { findPageForVerse } from './utils';
import { Assignment, AssignmentPart } from '@/types';

export const TOTAL_PAGES = 604;
export const TOTAL_JUZ = 30;

// Surah mapping
const surahNameToNumberMap: Record<string, number> = {};
surahData.forEach((s: any) => {
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

// Page detection
export function getAyahsInRange(part: AssignmentPart): string[] {
    const ayahs: string[] = [];
    if (!part.surahName || !part.fromAyah || !part.toAyah) return ayahs;

    const startNum = getSurahNumber(part.surahName);
    const endNum = part.endSurahName ? getSurahNumber(part.endSurahName) : startNum;

    if (!startNum || !endNum) return ayahs;

    if (startNum === endNum) {
        // Standard single-surah range
        const min = Math.min(part.fromAyah, part.toAyah);
        const max = Math.max(part.fromAyah, part.toAyah);
        for (let i = min; i <= max; i++) {
            ayahs.push(`${startNum}:${i}`);
        }
    } else {
        // Cross-surah range
        const minS = Math.min(startNum, endNum);
        const maxS = Math.max(startNum, endNum);

        for (let s = minS; s <= maxS; s++) {
            const sInfo = surahData.find((sd: any) => sd.number === s);
            if (!sInfo) continue;
            const verses = sInfo.verses;

            let startA = 1;
            let endA = verses;

            if (s === startNum) startA = part.fromAyah;
            if (s === endNum) endA = part.toAyah;

            // Handle potential reverse ranges if teachers do something weird
            const currentMin = Math.min(startA, endA);
            const currentMax = Math.max(startA, endA);

            for (let a = currentMin; a <= currentMax; a++) {
                ayahs.push(`${s}:${a}`);
            }
        }
    }
    return ayahs;
}

export function getPagesCovered(part: AssignmentPart): number[] {
    const ayahs = getAyahsInRange(part);
    const pages = new Set<number>();
    
    ayahs.forEach(key => {
        const { surah, ayah } = parseVerseKey(key);
        const p = findPageForVerse(surah, ayah);
        if (p) pages.add(p);
    });

    return Array.from(pages).sort((a, b) => a - b);
}

export function calculateGradedAyahs(assignments: Assignment[]): Set<string> {
    const gradedAyahs = new Set<string>();
    assignments.forEach(a => {
        if (a.gradeHifz && a.gradeHifz !== 'Ikke læst') {
            const ayahs = getAyahsInRange(a.hifz);
            ayahs.forEach(key => gradedAyahs.add(key));
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
            // Multi-surah page
            // 1. End of first surah
            const firstSurahVerses = surahData.find((s: any) => s.number === start.surah)?.verses || 0;
            for (let a = start.ayah; a <= firstSurahVerses; a++) {
                if (!gradedAyahs.has(`${start.surah}:${a}`)) {
                    allDone = false;
                    break;
                }
            }
            if (allDone) {
                // 2. Full surahs in between (if any)
                for (let s = start.surah + 1; s < end.surah; s++) {
                    const verses = surahData.find((x: any) => x.number === s)?.verses || 0;
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
                // 3. Start of last surah
                for (let a = 1; a <= end.ayah; a++) {
                    if (!gradedAyahs.has(`${end.surah}:${a}`)) {
                        allDone = false;
                        break;
                    }
                }
            }
        }

        if (allDone) {
            completedPages.add(page);
        }
    }
    
    return completedPages;
}

export function calculateCompletedSurahs(assignments: Assignment[]): Set<number> {
    const gradedAyahs = calculateGradedAyahs(assignments);
    const completedSurahs = new Set<number>();

    surahData.forEach((s: any) => {
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

// FAIR SCORE CALCULATION
// 40% Fulfillment, 30% Quality, 20% Consistency, 10% Plan Discipline

const GRADE_VALUES: Record<string, number> = {
    'Perfekt': 100,
    'Meget godt': 85,
    'Godt': 70,
    'Ikke læst': 0
};

export function calculateFairScore(assignments: Assignment[], courseDuration: string, startDate: Date): number {
    if (assignments.length === 0) return 0;

    // 1. Fulfillment (40%)
    // Ratio of completed assignments vs total assignments assigned
    const completedCount = assignments.filter(a => a.gradeHifz && a.gradeHifz !== 'Ikke læst').length;
    const fulfillmentScore = (completedCount / assignments.length) * 100;

    // 2. Quality (30%)
    const grades = assignments
        .map(a => GRADE_VALUES[a.gradeHifz || ''] || 0)
        .filter(v => v > 0);
    const qualityScore = grades.length > 0 ? grades.reduce((a: number, b: number) => a + b, 0) / grades.length : 0;

    // 3. Consistency (20%)
    // Based on streaks in the last 30 days
    // Simple version: percentage of days with an assignment in the last 14 days
    const consistencyScore = Math.min(100, (completedCount / 10) * 100); // Placeholder logic

    // 4. Plan Discipline (10%)
    // How close are we to the target page based on the plan?
    const targetPagesInPlan = courseDuration === '1.5' ? 1.1 : courseDuration === '3' ? 0.55 : 0.33; // pages per day
    const daysSinceStart = Math.max(1, (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const expectedPages = Math.min(TOTAL_PAGES, daysSinceStart * targetPagesInPlan);
    const actualPages = calculateCompletedPages(assignments).size;
    const disciplineScore = Math.max(0, 100 - Math.abs(expectedPages - actualPages) * 2);

    const fairScore = (fulfillmentScore * 0.4) + (qualityScore * 0.3) + (consistencyScore * 0.2) + (disciplineScore * 0.1);
    return Math.round(fairScore);
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
    // Collect all unique graded ayahs with their dates
    const gradedWithDates: {ayahKey: string, date: Date}[] = [];
    assignments.forEach(a => {
        const isGraded = a.gradeHifz && a.gradeHifz !== 'Ikke læst';
        if (isGraded && (a.gradedAt || a.assignedAt)) {
            const date = (a.gradedAt || a.assignedAt).toDate ? (a.gradedAt || a.assignedAt).toDate() : new Date(a.gradedAt || a.assignedAt);
            const ayahs = getAyahsInRange(a.hifz);
            ayahs.forEach(ayahKey => {
                gradedWithDates.push({ ayahKey, date });
            });
        }
    });

    // Sort by date
    gradedWithDates.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Generate daily map of cumulative ayahs
    const history: {date: string, pages: number}[] = [];
    const gradedSet = new Set<string>();
    
    // To calculate pages, we need to re-verify page completion at each step
    // But for a graph, showing unique graded ayahs as "approximate pages" (ayahs/10) or just using the latest page set is usually enough
    // Let's do a slightly simplified approach for the graph: count ayahs/10.27 (6236/604) or just use graded pages over time.
    
    // Better: Group assignments by day and calculate completed pages at each day.
    const assignmentsByDay: Record<string, Assignment[]> = {};
    assignments.forEach(a => {
        if (a.gradeHifz && a.gradeHifz !== 'Ikke læst' && (a.gradedAt || a.assignedAt)) {
            const dateObj = (a.gradedAt || a.assignedAt).toDate ? (a.gradedAt || a.assignedAt).toDate() : new Date(a.gradedAt || a.assignedAt);
            const dateStr = dateObj.toISOString().split('T')[0];
            if (!assignmentsByDay[dateStr]) assignmentsByDay[dateStr] = [];
            assignmentsByDay[dateStr].push(a);
        }
    });

    const sortedDays = Object.keys(assignmentsByDay).sort();
    const cumulativeAssignments: Assignment[] = [];
    
    sortedDays.forEach(dayStr => {
        cumulativeAssignments.push(...assignmentsByDay[dayStr]);
        history.push({
            date: dayStr,
            pages: calculateCompletedPages(cumulativeAssignments).size
        });
    });

    return history;
}

// FORECAST
export function calculateForecast(assignments: Assignment[], courseDuration: string): ForecastResult {
    const sortedAssignments = [...assignments]
        .filter(a => a.gradeHifz && a.gradeHifz !== 'Ikke læst' && (a.gradedAt || a.assignedAt))
        .sort((a, b) => {
            const da = (a.gradedAt || a.assignedAt).toDate ? (a.gradedAt || a.assignedAt).toDate().getTime() : new Date(a.gradedAt || a.assignedAt).getTime();
            const db = (b.gradedAt || b.assignedAt).toDate ? (b.gradedAt || b.assignedAt).toDate().getTime() : new Date(b.gradedAt || b.assignedAt).getTime();
            return da - db;
        });

    const firstGradedAt = sortedAssignments.length > 0 
        ? ((sortedAssignments[0].gradedAt || sortedAssignments[0].assignedAt).toDate ? (sortedAssignments[0].gradedAt || sortedAssignments[0].assignedAt).toDate() : new Date(sortedAssignments[0].gradedAt || sortedAssignments[0].assignedAt))
        : null;

    const completedPages = calculateCompletedPages(assignments).size;
    const today = new Date();
    
    // Pace based on last 4 weeks (28 days)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(today.getDate() - 28);
    
    const recentAssignments = assignments.filter(a => {
        if (!a.gradeHifz || a.gradeHifz === 'Ikke læst' || (!a.gradedAt && !a.assignedAt)) return false;
        const d = (a.gradedAt || a.assignedAt).toDate ? (a.gradedAt || a.assignedAt).toDate() : new Date(a.gradedAt || a.assignedAt);
        return d >= fourWeeksAgo;
    });

    const oldAssignments = assignments.filter(a => {
        if (!a.gradeHifz || a.gradeHifz === 'Ikke læst' || (!a.gradedAt && !a.assignedAt)) return false;
        const d = (a.gradedAt || a.assignedAt).toDate ? (a.gradedAt || a.assignedAt).toDate() : new Date(a.gradedAt || a.assignedAt);
        return d < fourWeeksAgo;
    });

    const pagesBefore4Weeks = calculateCompletedPages(oldAssignments).size;
    const pagesCompletedRecent = completedPages - pagesBefore4Weeks;
    const pace4WeeksEachDay = pagesCompletedRecent / 28;

    // Target end date
    let targetFinishDate = null;
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

    if (pace4WeeksEachDay <= 0 || !firstGradedAt) return { 
        completedPages, 
        actualPace4Weeks: pace4WeeksEachDay, 
        daysRemaining: Infinity, 
        estimatedFinishDate: null,
        targetFinishDate,
        diffDays: 0,
        status: 'on-track',
        percentAheadBehind,
        startDate: firstGradedAt
    };

    const remainingPages = TOTAL_PAGES - completedPages;
    const daysRemaining = Math.round(remainingPages / pace4WeeksEachDay);
    const estimatedFinishDate = new Date();
    estimatedFinishDate.setDate(estimatedFinishDate.getDate() + daysRemaining);

    // Re-calculate target days and diff
    let targetDays = 0;
    if (firstGradedAt && targetFinishDate) {
        targetDays = (targetFinishDate.getTime() - firstGradedAt.getTime()) / (1000 * 60 * 60 * 24);
    }

    const diffDays = targetFinishDate 
        ? Math.round((estimatedFinishDate.getTime() - targetFinishDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    // Use a 7-day threshold for "on-track"
    const status = diffDays < -7 ? 'ahead' : diffDays > 7 ? 'behind' : 'on-track';
    
    // User wants the percentage based on CURRENT progress relative to target plan,
    // not based on the 4-week pace forecast spikes.
    // percentAheadBehind is already calculated at line 353 based on (completed - expected) / TOTAL
    
    return {
        completedPages,
        actualPace4Weeks: pace4WeeksEachDay,
        daysRemaining,
        estimatedFinishDate,
        targetFinishDate,
        diffDays,
        status,
        percentAheadBehind,
        startDate: firstGradedAt
    };
}

export function calculateStreakPoints(assignments: Assignment[]): number {
    const graded = assignments.filter(a => a.gradeHifz && a.gradeHifz !== 'Ikke læst' && (a.gradedAt || a.assignedAt));
    if (graded.length === 0) return 0;

    // Group by week
    const weeks: Record<string, number> = {};
    graded.forEach(a => {
        const d = (a.gradedAt || a.assignedAt).toDate ? (a.gradedAt || a.assignedAt).toDate() : new Date(a.gradedAt || a.assignedAt);
        const oneJan = new Date(d.getFullYear(), 0, 1);
        const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
        const key = `${d.getFullYear()}-${weekNum}`;
        weeks[key] = (weeks[key] || 0) + 1;
    });

    const sortedWeeks = Object.keys(weeks).sort();
    let totalPoints = 0;
    
    // Check for gaps
    // A gap breaks the streak (resets points to 0) as per user request
    const today = new Date();
    const oneJan = new Date(today.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((today.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const currentWeekNum = Math.ceil((today.getDay() + 1 + numberOfDays) / 7);
    const currentWeekKey = `${today.getFullYear()}-${currentWeekNum}`;

    // We start from the first week and build up
    // But if we hit a gap, we reset
    let runningStreakPoints = 0;
    
    // Basic logic: iterate through all weeks from the first recorded one to "this week"
    // If a week is missing, reset points.
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
            // Points: 1 = 1, 2 = 1.75, 3+ = 2
            const pts = sessions === 1 ? 1 : sessions === 2 ? 1.75 : 2;
            runningStreakPoints += pts;
        } else {
            // Missed week = Reset
            runningStreakPoints = 0;
        }
        
        if (key === currentWeekKey) break;
        tempDate.setDate(tempDate.getDate() + 7);
        if (tempDate > new Date(today.getTime() + 7 * 86400000)) break; // safety
    }

    return parseFloat(runningStreakPoints.toFixed(2));
}

export function calculateLeaderboardScore(assignments: Assignment[], plan: string, frequency: number, timeframe: 'month' | 'all'): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const filtered = assignments.filter(a => {
        if (timeframe === 'all') return true;
        const d = (a.gradedAt || a.assignedAt).toDate ? (a.gradedAt || a.assignedAt).toDate() : new Date(a.gradedAt || a.assignedAt);
        return d >= startOfMonth;
    });

    if (filtered.length === 0) return 0;

    const graded = filtered.filter(a => a.gradeHifz && a.gradeHifz !== 'Ikke læst');
    if (graded.length === 0) return 0;

    // 1. QUALITY (50%) - Average Grade (Excellence)
    const grades = graded.map(a => GRADE_VALUES[a.gradeHifz || ''] || 0);
    const avgGradeScore = grades.length > 0 ? (grades.reduce((a, b) => a + b, 0) / grades.length) : 0;
    const qualityScore = avgGradeScore; // GRADE_VALUES are out of 100

    // 2. ATTENDANCE STABILITY (40%) - Using 1, 1.75, 2 point ratios
    // Group by weeks to find points earned vs max points (2 pts per week)
    const weekMap: Record<string, number> = {};
    graded.forEach(a => {
        const d = (a.gradedAt || a.assignedAt).toDate ? (a.gradedAt || a.assignedAt).toDate() : new Date(a.gradedAt || a.assignedAt);
        const oneJan = new Date(d.getFullYear(), 0, 1);
        const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
        const key = `${d.getFullYear()}-${weekNum}`;
        weekMap[key] = (weekMap[key] || 0) + 1;
    });

    let attendancePointsEarned = 0;
    const weeksList = Object.keys(weekMap);
    weeksList.forEach(w => {
        const sessions = weekMap[w];
        if (sessions === 1) attendancePointsEarned += 1;
        else if (sessions === 2) attendancePointsEarned += 1.75;
        else if (sessions >= 3) attendancePointsEarned += 2;
    });

    let weeksCount = 4; // Default for month
    if (timeframe === 'all') {
        // Find the earliest assignment date for this student
        const firstAssignmentDate = assignments.reduce((earliest, a) => {
            const d = (a.gradedAt || a.assignedAt).toDate ? (a.gradedAt || a.assignedAt).toDate() : new Date(a.gradedAt || a.assignedAt);
            if (!earliest) return d;
            return d < earliest ? d : earliest;
        }, null as Date | null);

        if (firstAssignmentDate) {
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - firstAssignmentDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // Calculate calendar weeks passed since start
            weeksCount = Math.max(1, Math.ceil(diffDays / 7));
        } else {
            weeksCount = weeksList.length || 1;
        }
    }

    const maxAttendancePoints = weeksCount * 2;
    const attendanceScore = maxAttendancePoints > 0 ? Math.min(100, (attendancePointsEarned / maxAttendancePoints) * 100) : 0;

    // 3. PLAN DISCIPLINE (10%) - Following their specific plan speed
    const pagesGraded = calculateCompletedPages(graded).size;
    const targetPagesPerWeek = plan === '1.5' ? 7.8 : plan === '3' ? 3.9 : 2.3;
    const expectedPagesTotal = weeksCount * targetPagesPerWeek;
    const disciplineScore = expectedPagesTotal > 0 ? Math.min(100, (pagesGraded / expectedPagesTotal) * 100) : 0;

    // FINAL SCORE (50/40/10)
    const finalScore = (qualityScore * 0.5) + (attendanceScore * 0.4) + (disciplineScore * 0.1);
    return Math.round(finalScore);
}
