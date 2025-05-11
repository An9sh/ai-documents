import { StarIcon } from '@heroicons/react/20/solid';

const testimonials = [
  {
    content: "This document classification system has revolutionized how we handle our legal documents. The AI-powered categorization is incredibly accurate and saves us countless hours of manual sorting.",
    author: "Sarah Johnson",
    role: "Legal Operations Manager",
    company: "LawTech Solutions",
    rating: 5,
  },
  {
    content: "The custom categories feature allows us to perfectly match our business needs. We've seen a 40% increase in document retrieval efficiency since implementing this system.",
    author: "Michael Chen",
    role: "Document Management Director",
    company: "Global Enterprises",
    rating: 5,
  },
  {
    content: "What impressed me most was the system's ability to understand context, not just keywords. It's like having an intelligent assistant that truly understands our documents.",
    author: "Emily Rodriguez",
    role: "Chief Information Officer",
    company: "TechForward Inc",
    rating: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <div id="testimonials" className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">Testimonials</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Trusted by professionals worldwide
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            See how our document classification system is helping organizations streamline their document management processes.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="flex flex-col justify-between rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200 xl:p-10"
            >
              <div className="flex items-center gap-x-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <StarIcon key={i} className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                ))}
              </div>
              <blockquote className="mt-6 text-lg leading-8 text-gray-900">
                "{testimonial.content}"
              </blockquote>
              <div className="mt-6 flex items-center gap-x-4">
                <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-gray-600">{testimonial.role}</div>
                  <div className="text-sm text-gray-500">{testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}