
export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserData {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  photoURL: string | null;
  phoneNumber: string | null;
  subscriptionAmount: number;
  studentNumber?: string;
}

// From quran.com v4 API
export type Surah = {
  id: number;
  revelation_place: "makkah" | "madinah";
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: [number, number];
  translated_name: {
    language_name: string;
    name: string;
  };
};

export type Verse = {
  id: number;
  verse_number: number;
  verse_key: string;
  hizb_number: number;
  rub_el_hizb_number: number;
  ruku_number: number;
  manzil_number: number;
  sajdah_number: number | null;
  page_number: number;
  juz_number: number;
  text_uthmani: string;
};
