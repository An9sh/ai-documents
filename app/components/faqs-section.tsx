import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

const faqs = [
  {
    question: 'What is DocuMatch?',
    answer:
      'DocuMatch is an AI-powered platform that helps you automatically organize, categorize, and analyze your documents for maximum efficiency and accuracy.',
  },
  {
    question: 'How secure is my data?',
    answer:
      'We use enterprise-grade encryption and follow industry best practices to ensure your documents and data are always safe and secure.',
  },
  {
    question: 'Can I create custom categories?',
    answer:
      'Yes! You can create and manage custom categories and requirements to fit your unique business needs.',
  },
  {
    question: 'Is there a free trial available?',
    answer:
      'Absolutely. You can get started for free and explore all the core features of DocuMatch with no commitment.',
  },
  {
    question: 'How does the AI classification work?',
    answer:
      'Our advanced AI algorithms analyze the content and context of your documents to provide highly accurate classification and categorization.',
  },
];

export default function FAQsSection() {
  return (
    <section id="faqs" className="bg-white py-16 sm:py-20 border-t border-gray-100">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">FAQs</h2>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Frequently Asked Questions
          </p>
          <p className="mt-2 text-md text-gray-500 max-w-xl mx-auto">
            Can't find the answer you're looking for? Reach out to the DocuMatch support team and we'll be happy to help.
          </p>
        </div>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 rounded-xl bg-gray-50 shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex-shrink-0">
                <QuestionMarkCircleIcon className="h-7 w-7 text-indigo-500" aria-hidden="true" />
              </div>
              <div>
                <dt className="text-base font-semibold text-gray-900 mb-1">{faq.question}</dt>
                <dd className="text-sm text-gray-600 leading-relaxed">{faq.answer}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
} 