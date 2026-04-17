
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
  studentNumber?: string;
  gender: UserGender;
  pendingDeletion?: boolean;
  deletionRequestedAt?: any; // Firestore Timestamp
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: any; // Firestore Timestamp
    targetAudience?: 'all' | 'teachers' | 'students';
    specificRecipients?: string[];
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
