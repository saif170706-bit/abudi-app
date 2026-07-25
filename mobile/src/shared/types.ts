export type UserRole = 'admin' | 'teacher' | 'student';
export type UserGender = 'man' | 'woman';

export interface UserData {
  uid: string;
  id: string; // uid
  email: string;
  role: UserRole;
  displayName: string;
  photoURL: string | null;
  phoneNumber: string | null;
  subscriptionAmount: number;
  gender: UserGender;
  studentNumber?: string;
  courseDuration?: string;
  pendingDeletion?: boolean;
  deletionRequestedAt?: any;
  deletionReason?: string;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: any; // Firestore Timestamp
    targetAudience?: 'all' | 'teachers' | 'students' | 'man' | 'woman' | 'specific';
    targetGender?: 'all' | 'man' | 'woman';
    specificRecipients?: string[];
    imageUrl?: string;
}

export interface UserAnnouncement {
    id: string; // This will be the same as the Announcement ID
    isRead: boolean;
}

export interface EventFormField {
    id: string;
    label: string;
    type: 'text' | 'radio' | 'checkbox';
    required: boolean;
    options?: string[];
    maxSelections?: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  createdAt: any; // Firestore Timestamp
  registrationDeadline: any; // Firestore Timestamp
  capacity: number;
  registrationCount: number;
  formFields: EventFormField[];
  allowExternalRegistrations: boolean;
  targetAudience?: 'all' | 'teachers' | 'students' | 'man' | 'woman' | 'specific';
  targetGender?: 'all' | 'man' | 'woman';
  specificRecipients?: string[];
  imageUrl?: string;
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  registeredAt: any; // Firestore Timestamp
  formData: { [key: string]: any };
}

export type QueueStudent = {
  id: string;
  name: string;
  type: 'physical' | 'virtual';
  photoURL?: string | null;
  fcmToken?: string | null;
  phoneNumber?: string | null;
  studentNumber?: string | null;
  source?: string | null;
  joinedAt?: any; // Firestore Timestamp
  joinedAtMs?: number;
  ticketNumber?: number;
};

export interface SurveyQuestion {
  id: string;
  text: string;
  type: 'scale' | 'text' | 'radio' | 'checkbox';
  options?: string[];
  required: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  type: 'survey';
  authorId: string;
  authorName: string;
  createdAt: any;
  deadline?: any; // Firestore Timestamp
  questions: SurveyQuestion[];
  targetAudience?: 'all' | 'teachers' | 'students' | 'man' | 'woman' | 'specific';
  targetGender?: 'all' | 'man' | 'woman';
  specificRecipients?: string[];
  imageUrl?: string;
  active: boolean;
}

export interface Livestream {
  id: string;
  title: string;
  description: string;
  type: 'livestream';
  authorId: string;
  authorName: string;
  createdAt: any;
  scheduledAt?: any; // Firestore Timestamp for when the meeting is held
  callId: string; // The Stream call ID
  isActive: boolean; // Is the meeting currently happening?
  targetAudience?: 'all' | 'teachers' | 'students' | 'man' | 'woman' | 'specific';
  targetGender?: 'all' | 'man' | 'woman';
  specificRecipients?: string[];
  imageUrl?: string;
  recordingUrl?: string | null;
  isRecordingAvailable?: boolean;
}

export interface AbsenceNote {
  id: string;
  text: string;
  createdAt: any; // Firestore Timestamp
  authorName: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  submittedAt: any;
  answers: Record<string, string | number | string[]>;
}

export interface AssignmentPart {
  surahName: string;
  fromAyah: number;
  toAyah: number;
  endSurahName?: string | null;
}

export interface Assignment {
  id: string;
  dueDate: string; // YYYY-MM-DD
  hifz: AssignmentPart;
  murajara: AssignmentPart;
  gradeHifz?: 'Perfekt' | 'Meget godt' | 'Godt' | 'Ikke læst' | null;
  gradeMurajara?: 'Perfekt' | 'Meget godt' | 'Godt' | 'Ikke læst' | null;
  notes?: string | null;
  assignedAt: any; // Firestore Timestamp
  gradedAt?: any; // Firestore Timestamp
  type?: string;
  surahNumber?: number;
}
