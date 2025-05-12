'use client';

import { useRouter } from 'next/navigation';
import { ArrowRightIcon, SparklesIcon, ShieldCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Easy Document Organization',
    description: 'Quickly upload, sort, and manage your documents in one secure place.',
    icon: SparklesIcon,
  },
  {
    name: 'Enterprise Security',
    description: 'Bank-level encryption and compliance standards keep your data safe.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Custom Categories',
    description: 'Create and manage categories tailored to your business needs.',
    icon: ChartBarIcon,
  },
];

export default function HeroSection() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/auth/signin');
  };

  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-b from-white to-gray-50">
      {/* Background decoration */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-200 to-indigo-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="mt-24 sm:mt-32 lg:mt-16">
          <div className="inline-flex space-x-6">
            <span className="rounded-full bg-indigo-600/10 px-3 py-1 text-sm font-semibold leading-6 text-indigo-600 ring-1 ring-inset ring-indigo-600/10">
              New Release
            </span>
            <span className="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-600">
              <span>Introducing AI-powered document classification</span>
              <ArrowRightIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </div>
        </div>

        <h1 className="mt-10 text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">Organize Your Documents</span>
          <span className="block text-indigo-600">with AI-Powered Intelligence</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Upload, classify, and manage your documents effortlessly using advanced AI technology.
          Get started in minutes and transform how you handle your documents.
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <div className="rounded-md shadow">
            <button
              onClick={handleGetStarted}
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition-all duration-200"
            >
              Get Started Free
            </button>
          </div>
          <div className="mt-3 sm:mt-0 sm:ml-3">
            <a
              href="#features"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10 transition-all duration-200"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div key={feature.name} className="flex items-start space-x-3">
              <feature.icon className="h-6 w-6 flex-none text-indigo-600" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{feature.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* App screenshot */}
        <div className="mt-16 mx-auto max-w-5xl">
          <div className="relative">
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-indigo-100 to-indigo-200 opacity-20 blur-xl"></div>
            <img
              src="/app_screenshot.png"
              alt="App screenshot"
              width={2432}
              height={1442}
              className="relative w-full rounded-xl shadow-2xl ring-1 ring-gray-900/10"
            />
          </div>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-indigo-200 to-indigo-400 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
    </div>
  );
} 