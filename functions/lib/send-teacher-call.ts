'use client'; 
import { getAuth } from "firebase/auth"; 
import { firebaseConfig } from "@/firebase/config"; 

interface TeacherCallPayload { 
    studentId: string; 
    callId: string; 
    type: 'physical' | 'virtual'; 
    teacherName: string; 
    room?: string; 
    link?: string; 
} 

export async function sendTeacherCall(payload: TeacherCallPayload) { 
    const auth = getAuth(); 
    const idToken = await auth.currentUser?.getIdToken(true); 
    if (!idToken) throw new Error("Not signed in"); 

    const url = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/sendTeacherCall`; 
    
    // The onCall function expects the payload to be nested under a 'data' key. 
    const body = { 
        data: { 
            ...payload, 
            teacherId: auth.currentUser!.uid, 
        } 
    }; 
    
    const res = await fetch(url, { 
        method: "POST", 
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${idToken}` 
        }, 
        body: JSON.stringify(body) 
    }); 
    
    const json = await res.json(); 
    
    if (!res.ok) { 
        console.error("sendTeacherCall failed:", json); 
        // Handle cases where the error response from a callable function is nested 
        const errorMessage = json.error?.message || json.error || "Push failed"; 
        throw new Error(errorMessage); 
    } 
    
    return json.result; 
}