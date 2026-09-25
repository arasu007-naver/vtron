import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  colorScheme?: 'default';
  /**
   * 글자 크기를 정하는 곳. 기본값은 데모 화면에 맞춘 큰 글씨라, 빽빽한 컨트롤 줄에 놓을 때는
   * 부르는 쪽이 줄여야 한다 — 바깥의 text-* 로는 못 덮는다(여기서 이미 정해 버리기 때문).
   */
  labelClassName?: string;
  descriptionClassName?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      colorScheme = 'default',
      labelClassName,
      descriptionClassName,
      ...props
    },
    ref
  ) => {
    const id = React.useId();
    
    const colorStyles = {
      default: 'border-gray-300 dark:border-gray-700 data-[checked]:bg-gray-900 data-[checked]:border-gray-900 dark:data-[checked]:bg-gray-100 dark:data-[checked]:border-gray-100 focus-visible:ring-gray-500',
    };

    return (
      <div className="flex items-start gap-2">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            id={props.id || id}
            ref={ref}
            className="peer sr-only"
            {...props}
          />
          <motion.div
            className={cn(
              "h-4 w-4 shrink-0 rounded border border-gray-300 dark:border-gray-700 ring-offset-white transition-all peer-disabled:cursor-not-allowed peer-disabled:opacity-50 dark:ring-offset-gray-950 cursor-pointer",
              colorStyles[colorScheme],
              "peer-checked:data-[checked]:border-transparent peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2",
              className
            )}
            data-checked={props.checked ? '' : undefined}
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 1 }}
            animate={{ scale: 1 }}
            onClick={() => {
              const input = document.getElementById(props.id || id) as HTMLInputElement;
              if (input && !props.disabled) {
                input.click();
              }
            }}
          >
            {props.checked && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.1 }}
                className="flex h-full w-full items-center justify-center"
              >
                <Check className="h-3 w-3 text-white dark:text-gray-900" />
              </motion.div>
            )}
          </motion.div>
        </div>
        {(label || description) && (
          <div className="grid gap-0.5 leading-none">
            {label && (
              <label
                htmlFor={props.id || id}
                className={cn(
                  'cursor-pointer text-[25.2px] font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                  labelClassName
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={cn('text-[21.6px] text-black dark:text-gray-400', descriptionClassName)}>
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;