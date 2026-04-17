'use client';

import React, { useState } from 'react';
import { QuranDataProvider } from '@/context/QuranDataContext';
import QuranIndex from '@/components/quran/QuranIndex';
import QuranReader from '@/components/quran/QuranReader';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function QuranPage() {
  const [activePage, setActivePage] = useState<number | null>(null);
  const router = useRouter();

  const handleNavigate = (page: number) => {
    setActivePage(page);
  };

  const BackToIndexButton = () => (
    <button 
      onClick={() => setActivePage(null)} 
      className="flex items-center hover:bg-gray-100 p-2 rounded-full transition-colors"
      aria-label="Back to Index"
    >
      <ArrowLeft className="w-6 h-6" />
    </button>
  );

  const BackToHomeButton = () => (
    <button 
      onClick={() => router.push('/')} 
      className="flex items-center hover:bg-gray-100 p-2 rounded-full transition-colors"
      aria-label="Back to Home"
    >
      <ArrowLeft className="w-6 h-6" />
    </button>
  );

  return (
    <QuranDataProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          {activePage === null ? (
             <QuranIndex onNavigate={handleNavigate} BackButton={BackToHomeButton} />
          ) : (
             <QuranReader initialPage={activePage} BackButton={BackToIndexButton} />
          )}
        </div>
      </div>
    </QuranDataProvider>
  );
}
