import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { Eye, EyeOff } from 'lucide-react';

const InputField = React.forwardRef(({ 
  className, 
  type = 'text', 
  label, 
  error, 
  leftIcon: LeftIcon,
  ...props 
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full flex flex-col gap-1.5 mb-4">
      {label && (
        <label className="text-sm font-medium text-text-primary ml-1">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {LeftIcon && (
          <div className="absolute left-4 text-text-secondary">
            <LeftIcon size={20} />
          </div>
        )}
        <input
          type={inputType}
          className={cn(
            "flex h-14 w-full rounded-xl border border-border-light bg-white px-4 py-2 text-base shadow-sm transition-colors",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-text-disabled",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-main/20 focus-visible:border-primary-main",
            "disabled:cursor-not-allowed disabled:opacity-50",
            LeftIcon && "pl-11",
            isPassword && "pr-11",
            error && "border-error focus-visible:ring-error/20 focus-visible:border-error",
            className
          )}
          ref={ref}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-error font-medium ml-1 mt-0.5">{error}</p>
      )}
    </div>
  );
});

InputField.displayName = "InputField";

export { InputField };
