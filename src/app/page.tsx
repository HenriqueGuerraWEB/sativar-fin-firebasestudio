
"use client";
import { useAuth } from "@/hooks/use-auth";
import { redirect } from 'next/navigation';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
     return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
    )
  }

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
