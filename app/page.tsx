"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/auth-context';
import { useEffect, useState } from 'react';
import HeroSection from './components/hero-section'
import FeaturesSection from './components/features-section'
import TestimonialsSection from './components/testimonials-section'
import BlogSection from './components/blog-section'
import FAQsSection from './components/faqs-section'
import FooterSection from './components/footer-section'

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (user) {
      router.push('/dashboard');
    } else {
      setIsLoading(false);
    }
  }, [user, router]);

  const handleGetStarted = () => {
    router.push('/auth/signin');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <BlogSection />
      <FAQsSection />
      <FooterSection />
    </main>
  );
}
