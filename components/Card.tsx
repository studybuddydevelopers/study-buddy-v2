"use client";

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'interactive';
  size?: 'sm' | 'md' | 'lg';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  onClick?: () => void;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  image?: {
    src: string;
    alt: string;
    position?: 'top' | 'bottom';
  };
}

export default function Card({
  children,
  variant = 'default',
  size = 'md',
  padding = 'md',
  shadow = 'md',
  hover = false,
  onClick,
  className = '',
  header,
  footer,
  image
}: CardProps) {
  
  // Base classes for all cards
  const baseClasses = "rounded-lg transition-all duration-200";
  
  // Variant-specific classes
  const variantClasses = {
    default: "bg-accent-500 border border-gray-200",
    elevated: "bg-accent-500 shadow-lg border-0",
    outlined: "bg-transparent border-2 border-primary-200",
    filled: "bg-primary-50 border border-primary-100",
    interactive: "bg-accent-500 border border-gray-200 cursor-pointer"
  };
  
  // Size-specific classes
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg"
  };
  
  // Padding classes
  const paddingClasses = {
    none: "",
    xs: "p-1",
    sm: "p-3",
    md: "p-6",
    lg: "p-8"
  };
  
  // Shadow classes
  const shadowClasses = {
    none: "",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl"
  };
  
  // Hover effects
  const hoverClasses = hover ? "hover:shadow-xl hover:-translate-y-1" : "";
  
  // Interactive state
  const interactiveClasses = onClick ? "cursor-pointer hover:shadow-lg" : "";
  
  // Combine all classes
  const cardClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${paddingClasses[padding]} ${shadowClasses[shadow]} ${hoverClasses} ${interactiveClasses} ${className}`;

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={cardClasses}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Header */}
      {header && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          {header}
        </div>
      )}
      
      {/* Top Image */}
      {image && image.position !== 'bottom' && (
        <div className="w-full">
          <img 
            src={image.src} 
            alt={image.alt}
            className="w-full h-48 object-cover rounded-t-lg"
          />
        </div>
      )}
      
      {/* Content */}
      <div className={padding === 'none' ? '' : 'px-6 py-4'}>
        {children}
      </div>
      
      {/* Bottom Image */}
      {image && image.position === 'bottom' && (
        <div className="w-full">
          <img 
            src={image.src} 
            alt={image.alt}
            className="w-full h-48 object-cover rounded-b-lg"
          />
        </div>
      )}
      
      {/* Footer */}
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
}