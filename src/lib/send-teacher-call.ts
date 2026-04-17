'use client';

import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

/**
 * Payload for the teacher call notification.
 */
interface TeacherCallPayload {
  studentId: string;
  callId: string;
  fcmToken?: string | null;
  type: 'physical' | 'virtual';
  teacherName: string;
  room?: string;
  link?: string;
}

/**
 * Client-side helper to trigger the sendTeacherCall Cloud Function.
 */
export async function sendTeacherCall(payload: TeacherCallPayload) {
  const app = getApp();
  const functions = getFunctions(app, 'us-central1');
  
  // Initialize the callable function
  const sendTeacherCallFn = httpsCallable<TeacherCallPayload, { success: boolean }>(
    functions, 
    'sendTeacherCall'
  );

  try {
    const result = await sendTeacherCallFn(payload);
    return result.data;
  } catch (error: any) {
    console.error("Error calling sendTeacherCall function:", error);
    // Surface the actual error message from the cloud function if available
    throw new Error(error.message || 'An unknown error occurred while sending the call.');
  }
}
