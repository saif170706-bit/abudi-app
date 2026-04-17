export interface Achievement {
  id: string;
  titleAr: string;
  titleEn: string;
  titleDa: string;
  titleSo: string;
  descAr: string;
  descEn: string;
  descDa: string;
  descSo: string;
  icon: string;
  category: "memorization" | "streak" | "review" | "attendance";
  threshold: number;
  thresholdUnit: "pages" | "juz" | "weeks" | "sessions";
  treeLevel: 1 | 2 | 3 | 4 | 5;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_page",
    titleAr: "أول خطوة", titleEn: "First Step", titleDa: "Første skridt", titleSo: "Tallaabada koowaad",
    descAr: "حفظت أول صفحة", descEn: "Memorized your first page", descDa: "Lærte din første side udenad", descSo: "Waxaad xifdisay boggaagii ugu horreeyay",
    icon: "📖", category: "memorization", threshold: 1, thresholdUnit: "pages", treeLevel: 1,
  },
  {
    id: "ten_pages",
    titleAr: "عشر صفحات", titleEn: "Ten Pages", titleDa: "Ti sider", titleSo: "Toban bog",
    descAr: "حفظت ١٠ صفحات", descEn: "Memorized 10 pages", descDa: "Lærte 10 sider udenad", descSo: "Waxaad xifdisay 10 bog",
    icon: "🌿", category: "memorization", threshold: 10, thresholdUnit: "pages", treeLevel: 1,
  },
  {
    id: "first_juz",
    titleAr: "أول جزء", titleEn: "First Juz", titleDa: "Første juz", titleSo: "Jizka koowaad",
    descAr: "أتممت أول جزء (٢٠ صفحة)", descEn: "Completed your first Juz (20 pages)", descDa: "Gennemførte dit første juz (20 sider)", descSo: "Waxaad dhammaystirtay Jiskii koowaad (20 bog)",
    icon: "📚", category: "memorization", threshold: 20, thresholdUnit: "pages", treeLevel: 2,
  },
  {
    id: "five_juz",
    titleAr: "خمسة أجزاء", titleEn: "Five Juz", titleDa: "Fem juz", titleSo: "Shan Jiz",
    descAr: "أتممت ٥ أجزاء", descEn: "Completed 5 Juz (100 pages)", descDa: "Gennemførte 5 juz (100 sider)", descSo: "Waxaad dhammaystirtay 5 Jiz (100 bog)",
    icon: "🌙", category: "memorization", threshold: 100, thresholdUnit: "pages", treeLevel: 3,
  },
  {
    id: "half_quran",
    titleAr: "نصف القرآن", titleEn: "Half the Quran", titleDa: "Halvt Koranen", titleSo: "Kala badh Qur'aanka",
    descAr: "حفظت نصف القرآن الكريم", descEn: "Memorized half the Holy Quran", descDa: "Lærte halvdelen af Koranen udenad", descSo: "Waxaad xifdisay kala badh Qur'aanka Kariimka ah",
    icon: "👑", category: "memorization", threshold: 302, thresholdUnit: "pages", treeLevel: 4,
  },
  {
    id: "full_quran",
    titleAr: "حافظ القرآن الكريم", titleEn: "Hafiz", titleDa: "Hafiz", titleSo: "Xaafid",
    descAr: "أتممت حفظ القرآن الكريم كاملاً", descEn: "Completed memorization of the full Quran", descDa: "Afsluttede memorering af hele Koranen", descSo: "Waxaad dhammaystirtay xifdiga Qur'aanka oo dhan",
    icon: "🕋", category: "memorization", threshold: 604, thresholdUnit: "pages", treeLevel: 5,
  },
  {
    id: "streak_5",
    titleAr: "٥ أسابيع متواصلة", titleEn: "5-Week Streak", titleDa: "5-uger streak", titleSo: "Xidhiidhka 5 toddobaad",
    descAr: "راجعت لمدة ٥ أسابيع متواصلة", descEn: "Reviewed for 5 consecutive weeks", descDa: "Lavede murajara i 5 uger i træk", descSo: "Waxaad muraajacaysay 5 toddobaad oo xidhiidh ah",
    icon: "🌟", category: "streak", threshold: 5, thresholdUnit: "weeks", treeLevel: 2,
  },
  {
    id: "streak_10",
    titleAr: "١٠ أسابيع متواصلة", titleEn: "10-Week Streak", titleDa: "10-uger streak", titleSo: "Xidhiidhka 10 toddobaad",
    descAr: "راجعت لمدة ١٠ أسابيع متواصلة", descEn: "Reviewed for 10 consecutive weeks", descDa: "Lavede murajara i 10 uger i træk", descSo: "Waxaad muraajacaysay 10 toddobaad oo xidhiidh ah",
    icon: "✨", category: "streak", threshold: 10, thresholdUnit: "weeks", treeLevel: 3,
  },
  {
    id: "reviews_20",
    titleAr: "٢٠ أسبوع مراجعة", titleEn: "Good Habits", titleDa: "Gode Vaner", titleSo: "Caadooyin wanaagsan",
    descAr: "راجعت لمدة ٢٠ أسبوعاً متواصلة", descEn: "Reviewed for 20 consecutive weeks", descDa: "Har opbygget en solid rutine med murajara i 20 uger i træk", descSo: "Waxaad muraajacaysay 20 toddobaad oo xidhiidh ah",
    icon: "🔄", category: "streak", threshold: 20, thresholdUnit: "weeks", treeLevel: 4,
  },
];

export interface AchievementStatus {
  achievement: Achievement;
  earned: boolean;
  currentValue: number;
  progress: number;
}

export function calculateAchievements(
  totalPages: number,
  currentStreak: number,
  reviewCount: number,
): AchievementStatus[] {
  return ACHIEVEMENTS.map(ach => {
    let currentValue = 0;
    if (ach.category === "memorization") currentValue = totalPages;
    else if (ach.category === "streak") currentValue = currentStreak;
    else if (ach.category === "review") currentValue = reviewCount;

    const earned = currentValue >= ach.threshold;
    const progress = Math.min(currentValue / ach.threshold, 1);
    return { achievement: ach, earned, currentValue, progress };
  });
}

export function getLatestEarned(statuses: AchievementStatus[]): AchievementStatus | null {
  const earned = statuses.filter(s => s.earned);
  return earned.length > 0 ? earned[earned.length - 1] : null;
}
