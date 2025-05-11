interface CardBackProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
  children?: React.ReactNode;
  id?: string;
  variant?: 'troop' | 'tactic';
}

export function CardBack({
  width = 'w-20',
  height = 'h-32',
  children,
  id,
  style,
  className = '',
  variant = 'troop',
  ...rest
}: CardBackProps) {
  const bgClass =
    variant === 'troop'
      ? 'bg-gray-800 border-gray-700'
      : 'bg-yellow-900 border-yellow-600';

  return (
    <div
      id={id}
      style={style}
      className={`${width} ${height} ${bgClass} rounded-lg shadow-md border-2 relative overflow-hidden hover:scale-105 transition-transform duration-200 ${className}`}
      {...rest}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`w-12 h-12 border-4 rounded-full ${
            variant === 'troop' ? 'border-gray-700' : 'border-yellow-500'
          }`}
        />
      </div>

      {children && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          {children}
        </div>
      )}

      <div className="absolute inset-0">
        <div className="w-full h-full bg-gradient-to-br from-black/20 to-transparent" />
      </div>
    </div>
  );
}
