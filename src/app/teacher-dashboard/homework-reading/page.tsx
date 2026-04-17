'use client';

import TeacherDashboard from "@/components/teacher/TeacherDashboard";
import { useUser, useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface TeacherHomeworkPageProps {
  setView: (view: 'overview' | 'homework-reading' | 'find-student') => void;
}

export default function TeacherHomeworkPage({ setView }: TeacherHomeworkPageProps) {
    const { user, loading: isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/');
        }
    }, [user, isUserLoading, router]);
    
    const BackButton = () => (
      <Button variant="ghost" size="icon" onClick={() => setView('overview')}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
    );

    if (isUserLoading || !user) {
        return (
          <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-12 w-12 animate-spin" />
          </div>
        );
    }

    return <TeacherDashboard BackButton={BackButton} />;
}
