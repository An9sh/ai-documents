'use client';

import { useState } from 'react';
import {
  EnvelopeIcon,
  UserIcon,
  PencilIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        alert('There was an error sending your message.');
      }
    } catch (err) {
      alert('There was an error sending your message.');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-indigo-50 flex items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        <div className="relative bg-white/95 rounded-3xl shadow-2xl border border-gray-100 overflow-hidden pt-20">
          {/* Gradient Banner */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-300 opacity-80 z-0" />
          {/* Icon */}
          <div className="absolute left-1/2 -top-10 transform -translate-x-1/2 z-10 mt-12">
            <div className="bg-white p-4 rounded-full shadow-lg border border-indigo-100">
              <ChatBubbleLeftRightIcon className="h-10 w-10 text-indigo-500" />
            </div>
          </div>
          {/* Divider */}
          <div className="flex justify-center mt-8 mb-4">
            <span className="block w-16 h-1 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-200 opacity-60" />
          </div>

          {/* Form Content */}
          <div className="relative z-10 px-8 pt-2 pb-10 sm:px-12">
            <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-3">Contact Us</h1>
            <p className="text-gray-500 text-center mb-10 text-base font-normal max-w-lg mx-auto">
              Have a question or need help? Fill out the form and we'll get back to you promptly.
            </p>

            {submitted ? (
              <div
                role="status"
                className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-6 text-center text-lg font-medium"
              >
                Thank you! We've received your message and will respond shortly.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Input Group */}
                {[
                  {
                    id: 'name',
                    label: 'Name',
                    type: 'text',
                    icon: <UserIcon className="h-6 w-6 text-indigo-300 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />,
                    placeholder: 'Your name',
                  },
                  {
                    id: 'email',
                    label: 'Email',
                    type: 'email',
                    icon: <EnvelopeIcon className="h-6 w-6 text-indigo-300 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />,
                    placeholder: 'you@example.com',
                  },
                  {
                    id: 'subject',
                    label: 'Subject',
                    type: 'text',
                    icon: <PencilIcon className="h-6 w-6 text-indigo-300 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />,
                    placeholder: 'Subject',
                  },
                ].map(({ id, label, type, icon, placeholder }) => (
                  <div key={id}>
                    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        type={type}
                        id={id}
                        name={id}
                        required
                        value={(form as any)[id]}
                        onChange={handleChange}
                        placeholder={placeholder}
                        className="w-full py-4 px-5 pr-12 text-lg bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder-gray-400 transition duration-150"
                      />
                      {icon}
                    </div>
                  </div>
                ))}

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Type your message here..."
                    className="w-full py-4 px-5 text-lg bg-white border border-gray-300 rounded-xl shadow-sm resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder-gray-400 transition duration-150"
                  />
                </div>

                {/* Submit */}
                <div>
                  <button
                    type="submit"
                    className="w-full py-4 px-6 text-lg font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl shadow-lg hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition-all duration-200"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
