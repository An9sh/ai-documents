import Link from 'next/link';

const blogs = [
  {
    title: 'How AI is Revolutionizing Document Management for Modern Businesses',
    summary:
      'Explore how artificial intelligence is transforming the way organizations handle, organize, and retrieve documents. Learn how solutions like DocuMatch are making document management smarter and more efficient.',
    slug: 'ai-revolution-document-management',
  },
  {
    title: 'Top 7 Benefits of Automated Document Classification',
    summary:
      'Discover the key advantages of using automated document classification tools, including time savings, reduced errors, improved compliance, and enhanced security with DocuMatch.',
    slug: 'benefits-automated-document-classification',
  },
  {
    title: 'Ensuring Data Security in the Age of Digital Documents',
    summary:
      'Understand the importance of data security in document management and how DocuMatch uses enterprise-grade encryption and best practices to keep your documents safe.',
    slug: 'data-security-digital-documents',
  },
  {
    title: 'Custom Categories: Tailoring Document Management to Your Business Needs',
    summary:
      'See how creating custom categories and requirements in DocuMatch can help different industries personalize their document organization for maximum efficiency.',
    slug: 'custom-categories-document-management',
  },
  {
    title: 'How to Get Started with DocuMatch: A Step-by-Step Guide',
    summary:
      'A simple walkthrough for new users on how to sign up, upload documents, create categories, and start classifying with DocuMatch.',
    slug: 'getting-started-with-documatch',
  },
];

export default function BlogSection() {
  return (
    <section id="blog" className="bg-gray-50 py-20 border-t border-gray-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">Blog</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Latest Insights & Resources
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{blog.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{blog.summary}</p>
              </div>
              <div>
                <Link
                  href={`/blog/${blog.slug}`}
                  className="inline-block mt-2 text-indigo-600 font-medium hover:underline text-sm"
                >
                  Read More
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 