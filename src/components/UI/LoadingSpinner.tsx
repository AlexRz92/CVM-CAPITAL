import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'blue' | 'gray';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'white' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    white: 'border-white/30 border-t-white',
    blue: 'border-blue-300/30 border-t-blue-300',
    gray: 'border-gray-400/30 border-t-gray-400'
  };

  return (
    <div className={`${sizeClasses[size]} border-2 ${colorClasses[color]} rounded-full animate-spin`}></div>
  );
};

export default LoadingSpinner;