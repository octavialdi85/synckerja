import React from 'react';

interface LoadingDotsProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  };

  return (
    <>
      <style>{`
        @keyframes loading-dots {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .loading-dot {
          animation: loading-dots 1.4s ease-in-out infinite;
        }
        .loading-dot-1 {
          animation-delay: 0ms;
        }
        .loading-dot-2 {
          animation-delay: 200ms;
        }
        .loading-dot-3 {
          animation-delay: 400ms;
        }
      `}</style>
      <div className={`flex items-center justify-center gap-1.5 ${className}`}>
        <div 
          className={`${sizeClasses[size]} bg-blue-600 rounded-full loading-dot loading-dot-1`}
        />
        <div 
          className={`${sizeClasses[size]} bg-blue-600 rounded-full loading-dot loading-dot-2`}
        />
        <div 
          className={`${sizeClasses[size]} bg-blue-600 rounded-full loading-dot loading-dot-3`}
        />
      </div>
    </>
  );
};

