
"use client";
import { useAuth } from "@/hooks/use-auth";
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingPage } from "@/components/layout/loading-page";

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

  return <LoadingPage />
}
