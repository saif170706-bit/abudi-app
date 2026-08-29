import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase/client';

/** Opens the image picker and uploads the chosen image to `avatars/{uid}`. Returns the download URL, or null if cancelled. */
export async function pickAndUploadAvatar(uid: string): Promise<string | null> {
  return pickAndUploadBanner(`avatars/${uid}`);
}

/** Opens the image picker and, if an image was chosen, uploads it to Storage. Returns the download URL, or null if cancelled. */
export async function pickAndUploadBanner(pathPrefix: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;

  const uri = result.assets[0].uri;
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileName = uri.split('/').pop()?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'image.jpg';
  const storageRef = ref(storage, `${pathPrefix}/${Date.now()}_${fileName}`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
