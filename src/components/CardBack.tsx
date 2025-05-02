import React from 'react';

interface CardBackProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
  children?: React.ReactNode; // For centered overlay like "46"
  id?: string;
}

export function CardBack({
  width = 'w-20',
  height = 'h-32',
  children,
  id,
  style,
  className = '',
  ...rest
}: CardBackProps) {
  return (
    <div
      id={id}
      style={style}
      className={`${width} ${height} bg-gray-800 rounded-lg shadow-md border-2 border-gray-700 relative overflow-hidden hover:scale-105 transition-transform duration-200 ${className}`}
      {...rest}
    >
      {/* Always render the circle in the background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-700 rounded-full" />
      </div>

      {/* Optional overlay content (e.g. cardsRemaining) */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          {children}
        </div>
      )}

      {/* Shading effect */}
      <div className="absolute inset-0">
        <div className="w-full h-full bg-gradient-to-br from-gray-700/30 to-transparent" />
      </div>
    </div>
  );
}
