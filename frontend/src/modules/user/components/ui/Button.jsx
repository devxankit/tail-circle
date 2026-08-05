import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'default', 
  isLoading = false, 
  disabled, 
  children, 
  ...props 
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-main disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    primary: "bg-primary-main text-white hover:bg-primary-dark shadow-sm",
    secondary: "bg-primary-light text-primary-dark hover:bg-primary-main/30",
    outline: "border-[1.5px] border-border-light bg-transparent hover:bg-bg-secondary text-text-primary",
    ghost: "hover:bg-bg-secondary text-text-primary",
    danger: "bg-error text-white hover:bg-error/90 shadow-sm",
  };

  const sizes = {
    default: "h-14 px-6 rounded-2xl text-base", // 56px height for mobile
    sm: "h-10 px-4 rounded-xl text-sm",
    lg: "h-16 px-8 rounded-[20px] text-lg",
    icon: "h-12 w-12 rounded-full",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      ref={ref}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };
