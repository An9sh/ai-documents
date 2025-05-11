import { 
  DocumentTextIcon, 
  MagnifyingGlassIcon, 
  ShieldCheckIcon, 
  ChartBarIcon,
  DocumentMagnifyingGlassIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'AI-Powered Classification',
    description: 'Our advanced AI algorithms automatically analyze and categorize your documents with high accuracy, saving you hours of manual work.',
    icon: CpuChipIcon,
  },
  {
    name: 'Smart Document Analysis',
    description: 'Go beyond simple keyword matching. Our system understands context and meaning to provide more accurate document classification.',
    icon: DocumentMagnifyingGlassIcon,
  },
  {
    name: 'Custom Categories',
    description: 'Create and manage custom categories and requirements to match your specific business needs and document types.',
    icon: DocumentTextIcon,
  },
  {
    name: 'Advanced Search',
    description: 'Find any document instantly with our powerful search capabilities, including semantic search and filters.',
    icon: MagnifyingGlassIcon,
  },
  {
    name: 'Secure Storage',
    description: 'Your documents are protected with enterprise-grade encryption and security measures to ensure data privacy.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Analytics Dashboard',
    description: 'Get valuable insights about your document collection, classification patterns, and usage statistics.',
    icon: ChartBarIcon,
  },
];

export default function FeaturesSection() {
  return (
    <div id="features" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">Features</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to manage documents intelligently
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Our document classification system combines cutting-edge AI technology with powerful features to help you organize and manage your documents efficiently.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <feature.icon className="h-5 w-5 flex-none text-indigo-600" aria-hidden="true" />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
} 