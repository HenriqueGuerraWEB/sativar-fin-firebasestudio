
"use client";
import { useAuth } from "@/hooks/use-auth";
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        redirect('/dashboard');
      } else {
        redirect('/login');
      }
    }
  }, [user, loading]);

  return (
      <div className="flex h-screen w-full items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
  )
}
