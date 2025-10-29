import React from 'react';

// Types for better organization
interface PerformanceBadge {
  id: string;
  type: 'best' | 'lead' | 'easy';
  title: string;
  subtitle: string;
  period: string;
}

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  position: string;
}

const AuthTestimonialsPanel = () => {
  // Data configuration for better maintainability
  const performanceBadges: PerformanceBadge[] = [
    {
      id: 'best-support',
      type: 'best',
      title: 'Best Support',
      subtitle: 'BEST',
      period: 'WINTER 2024'
    },
    {
      id: 'leader',
      type: 'lead',
      title: 'Leader',
      subtitle: 'LEAD',
      period: '2024'
    },
    {
      id: 'easiest-to-use',
      type: 'easy',
      title: 'Easiest To Use',
      subtitle: 'EASY',
      period: 'WINTER 2024'
    }
  ];

  const testimonials: Testimonial[] = [
    {
      id: 'resa-linda',
      quote: 'A Game-Changer for Performance Management.',
      author: 'Resa Linda',
      position: 'Corporate HR Manager'
    },
    {
      id: 'agus-cto',
      quote: 'ProfitLoop is the best OKR tool on the market.',
      author: 'Agus',
      position: 'Chief Technology Officer'
    },
    {
      id: 'veronica-hc',
      quote: 'Versatile system, and with great support from the ProfitLoop team.',
      author: 'Veronica',
      position: 'Head of Human Capital'
    }
  ];

  // Component for performance badge
  const PerformanceBadge = ({ badge }: { badge: PerformanceBadge }) => (
    <div className="text-left">
      <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2 ${
        badge.type === 'best' ? 'bg-blue-100 text-blue-700' :
        badge.type === 'lead' ? 'bg-green-100 text-green-700' :
        'bg-purple-100 text-purple-700'
      }`}>
        {badge.subtitle}
      </div>
      <div className="text-sm text-gray-700">
        <div className="font-semibold">{badge.title}</div>
        <div className="text-xs text-gray-500">{badge.period}</div>
      </div>
    </div>
  );

  // Component for testimonial quote
  const TestimonialQuote = ({ testimonial }: { testimonial: Testimonial }) => (
    <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50">
      <blockquote className="text-gray-800 text-lg leading-relaxed mb-3">
        "{testimonial.quote}"
      </blockquote>
      <cite className="text-sm text-gray-600 not-italic">
        - {testimonial.author}, {testimonial.position}
      </cite>
    </div>
  );

  return (
    <div className="flex-1 bg-gray-100 flex items-center justify-center p-12">
      <div className="max-w-md space-y-8 w-full">
        {/* Main Heading */}
        <header className="text-left">
          <h2 className="text-3xl font-bold text-gray-900 leading-tight">
            Consistent top-tier performance
          </h2>
        </header>
        
        {/* Performance Badges Section */}
        <section className="flex flex-wrap gap-6 justify-start">
          {performanceBadges.map((badge) => (
            <PerformanceBadge key={badge.id} badge={badge} />
          ))}
        </section>

        {/* Testimonials Section */}
        <section className="space-y-4">
            {testimonials.map((testimonial) => (
            <TestimonialQuote key={testimonial.id} testimonial={testimonial} />
          ))}
        </section>
      </div>
    </div>
  );
};
export { AuthTestimonialsPanel };