import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, wrapperClassName, ...props }, ref) => {
    return (
      <div className={cn("space-y-2", wrapperClassName)}>
        {label && (
          <label
            htmlFor={props.id}
            className="block text-[25.2px] font-medium text-black dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <input
          className={cn(
            "flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[25.2px] text-black shadow-sm transition-colors file:border-0 file:bg-transparent file:text-[25.2px] file:font-medium placeholder:text-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-400",
            error && "border-gray-500 focus-visible:ring-gray-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-[25.2px] text-black dark:text-gray-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;