import { notFound } from 'next/navigation';
import Link from 'next/link';

const blogPosts = [
  {
    slug: 'ai-revolution-document-management',
    title: 'How AI is Revolutionizing Document Management for Modern Businesses',
    content: `
      <p>Artificial intelligence (AI) is rapidly transforming the way organizations manage their documents. With the explosion of digital data, traditional manual methods of organizing and retrieving documents are no longer efficient or scalable. AI-powered solutions like <strong>DocuMatch</strong> are leading the way in automating document classification, extraction, and analysis.</p>
      <h2 class="mt-8 mb-2 text-xl font-semibold">Why AI Matters in Document Management</h2>
      <p>AI can process vast amounts of unstructured data, recognize patterns, and classify documents with high accuracy. This means less time spent on manual sorting and more time focusing on what matters most for your business.</p>
      <ul class="list-disc ml-6 my-4 text-gray-700">
        <li>Automated document categorization</li>
        <li>Faster search and retrieval</li>
        <li>Improved compliance and security</li>
        <li>Actionable insights from document analytics</li>
      </ul>
      <p>With DocuMatch, you can unlock the full potential of your document data and stay ahead in the digital age.</p>
    `,
  },
  {
    slug: 'benefits-automated-document-classification',
    title: 'Top 7 Benefits of Automated Document Classification',
    content: `
      <ol class="list-decimal ml-6 my-4 text-gray-700">
        <li><strong>Time Savings:</strong> Instantly sort and organize documents.</li>
        <li><strong>Reduced Errors:</strong> Minimize human mistakes in classification.</li>
        <li><strong>Improved Compliance:</strong> Ensure documents are handled according to regulations.</li>
        <li><strong>Enhanced Security:</strong> Protect sensitive information with automated controls.</li>
        <li><strong>Better Collaboration:</strong> Make documents easily accessible to the right teams.</li>
        <li><strong>Scalability:</strong> Handle growing volumes of documents effortlessly.</li>
        <li><strong>Data-Driven Decisions:</strong> Gain insights from document analytics.</li>
      </ol>
      <p>DocuMatch delivers all these benefits and more, making it the smart choice for modern businesses.</p>
    `,
  },
  {
    slug: 'data-security-digital-documents',
    title: 'Ensuring Data Security in the Age of Digital Documents',
    content: `
      <p>Data security is a top concern for any organization managing sensitive documents. DocuMatch uses enterprise-grade encryption, access controls, and compliance with industry standards to keep your data safe.</p>
      <h2 class="mt-8 mb-2 text-xl font-semibold">Best Practices for Document Security</h2>
      <ul class="list-disc ml-6 my-4 text-gray-700">
        <li>Encrypt documents at rest and in transit</li>
        <li>Implement role-based access controls</li>
        <li>Regularly audit document access and usage</li>
        <li>Stay compliant with regulations like GDPR and HIPAA</li>
      </ul>
      <p>With DocuMatch, you can be confident that your documents are protected at every stage.</p>
    `,
  },
  {
    slug: 'custom-categories-document-management',
    title: 'Custom Categories: Tailoring Document Management to Your Business Needs',
    content: `
      <p>Every business is unique, and so are its document management needs. DocuMatch allows you to create custom categories and requirements, ensuring your documents are organized in a way that makes sense for your workflows.</p>
      <h2 class="mt-8 mb-2 text-xl font-semibold">Industry Examples</h2>
      <ul class="list-disc ml-6 my-4 text-gray-700">
        <li><strong>Legal:</strong> Organize contracts, case files, and compliance documents.</li>
        <li><strong>Finance:</strong> Categorize invoices, statements, and reports.</li>
        <li><strong>Healthcare:</strong> Manage patient records, insurance forms, and lab results.</li>
      </ul>
      <p>With DocuMatch, you have the flexibility to adapt document management to your business.</p>
    `,
  },
  {
    slug: 'getting-started-with-documatch',
    title: 'How to Get Started with DocuMatch: A Step-by-Step Guide',
    content: `
      <p>Getting started with <strong>DocuMatch</strong> is simple and fast. This guide will walk you through the essential steps to begin organizing and classifying your documents with ease.</p>
      <h2 class="mt-8 mb-2 text-xl font-semibold">Step 1: Sign Up for an Account</h2>
      <p>Visit the DocuMatch website and create your free account using your email address. Follow the instructions in your inbox to verify your account.</p>
      <h2 class="mt-8 mb-2 text-xl font-semibold">Step 2: Upload Your Documents</h2>
      <p>Once logged in, use the intuitive dashboard to upload your documents. You can drag and drop files or select them from your device.</p>
      <h2 class="mt-8 mb-2 text-xl font-semibold">Step 3: Create Categories</h2>
      <p>Set up custom categories that match your business needs. For example, you might create categories for invoices, contracts, or reports.</p>
      <h2 class="mt-8 mb-2 text-xl font-semibold">Step 4: Start Classifying</h2>
      <p>Let DocuMatch's AI automatically classify your documents, or manually assign them to categories as needed. Review and adjust as you go for the best results.</p>
      <h2 class="mt-8 mb-2 text-xl font-semibold">Step 5: Explore Features</h2>
      <p>Take advantage of analytics, search, and other features to get the most out of your organized documents.</p>
      <p>With these simple steps, you'll be on your way to smarter, more efficient document management with DocuMatch!</p>
    `,
  },
];

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((b) => b.slug.toLowerCase() === params.slug.toLowerCase());
  if (!post) return notFound();

  return (
    <main className="bg-white min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-indigo-600 hover:underline text-sm">← Back to Home</Link>
        <h1 className="mt-6 text-3xl font-bold text-gray-900">{post.title}</h1>
        <article className="prose prose-indigo mt-6" dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </main>
  );
} 