// This hook is no longer used for live searching but we keep the type definition
// for other components.
export type PublicUser = {
  id: string;
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
};
