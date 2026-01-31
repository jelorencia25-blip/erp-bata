'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('user');

    if (!user) {
      router.replace('/login');
      return;
    }

    // default page setelah login
    router.replace('/dashboard');
  }, []);

  return null;
}
