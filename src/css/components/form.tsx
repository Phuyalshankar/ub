// /src/lib/form.tsx - v17.13.3
// 📝 Form Components - Input, Select, Checkbox, Radio, etc.
// ✅ ALL manual textColor हटाइयो
// ✅ Engine लाई पूर्ण auto-inversion गर्न दिइयो
// ✅ Input text color fixed - अब engine auto color लागू हुनेछ
// ✅ Placeholder को लागि मात्र specific color

import React, { forwardRef } from 'react';
import { ub } from '../mycss';

// ==================== UTILITIES ====================

const cls = (...classes: (string | undefined | false | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// ==================== COLOR HELPERS ====================
// Only bgColor and borderColor - NO textColor helper used

const bgColor = (color: string, shade: number | string, opacity?: number): string => {
  return opacity ? `bg-${color}-${shade}/${opacity}` : `bg-${color}-${shade}`;
};

const borderColor = (color: string, shade: number | string, opacity?: number): string => {
  return opacity ? `border-${color}-${shade}/${opacity}` : `border-${color}-${shade}`;
};

// ==================== TYPES ====================

export type InputSize = 'sm' | 'md' | 'lg';

// ==================== INPUT ====================

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  size?: InputSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  success,
  hint,
  size = 'md',
  fullWidth = true,
  leftIcon,
  rightIcon,
  className = '',
  disabled = false,
  required = false,
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const sizeClasses = {
    sm: cls('p-1.5', 'text-sm', 'rounded-1.5'),
    md: cls('p-2', 'text-base', 'rounded-2'),
    lg: cls('p-2.5', 'text-lg', 'rounded-2.5'),
  };

  // 🎯 FIX: stateClasses मा borderColor मात्र हुनुपर्छ
  const stateClasses = error 
    ? borderColor('red', 180)      // border-red-180 मात्र
    : success 
      ? borderColor('green', 180)  // border-green-180 मात्र
      : borderColor('gray', 150);   // border-gray-150 मात्र

  const iconPadding = {
    sm: leftIcon ? 'pl-7' : rightIcon ? 'pr-7' : '',
    md: leftIcon ? 'pl-9' : rightIcon ? 'pr-9' : '',
    lg: leftIcon ? 'pl-11' : rightIcon ? 'pr-11' : '',
  };

  return (
    <div className={cls(fullWidth ? 'w-full' : '', className)}>
      {label && (
        <label 
          htmlFor={inputId}
          className={ub(cls('block mb-1', size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'))}
        >
          {label}
          {required && <span className={ub('text-red-180')}> *</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <span className={ub(cls('absolute left-2 top-1/2 -translate-y-1/2', disabled ? 'opacity-50' : ''))}>
            {leftIcon}
          </span>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={ub(cls(
            'w-full', 
            sizeClasses[size], 
            stateClasses, 
            'border', 
            bgColor('gray', 0), 
            // ⚠️ IMPORTANT: कुनै text color नराख्ने - engine auto देगा
            'placeholder:text-gray-150',
            'focus:outline-none focus:border-blue-200', 
            disabled ? 'opacity-50 cursor-not-allowed' : '', 
            leftIcon ? iconPadding[size] : '', 
            rightIcon ? iconPadding[size] : '', 
            'transition-all duration-200'
          ))}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        
        {rightIcon && (
          <span className={ub(cls('absolute right-2 top-1/2 -translate-y-1/2', disabled ? 'opacity-50' : ''))}>
            {rightIcon}
          </span>
        )}
      </div>
      
      {error && <p id={`${inputId}-error`} className={ub(cls('mt-1 text-sm text-red-180'))}>{error}</p>}
      {success && !error && <p className={ub(cls('mt-1 text-sm text-green-180'))}>{success}</p>}
      {hint && !error && !success && <p className={ub(cls('mt-1 text-xs text-gray-150'))}>{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';

// ==================== TEXTAREA ====================

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  size?: InputSize;
  fullWidth?: boolean;
  rows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  hint,
  size = 'md',
  fullWidth = true,
  rows = 4,
  className = '',
  disabled = false,
  required = false,
  id,
  ...props
}, ref) => {
  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  const sizeClasses = {
    sm: cls('p-1.5', 'text-sm', 'rounded-1.5'),
    md: cls('p-2', 'text-base', 'rounded-2'),
    lg: cls('p-2.5', 'text-lg', 'rounded-2.5'),
  };

  return (
    <div className={cls(fullWidth ? 'w-full' : '', className)}>
      {label && (
        <label htmlFor={inputId} className={ub(cls('block mb-1', size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'))}>
          {label}{required && <span className={ub('text-red-180')}> *</span>}
        </label>
      )}
      
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={ub(cls(
          'w-full', 
          sizeClasses[size], 
          error ? borderColor('red', 180) : borderColor('gray', 150), 
          'border', 
          bgColor('gray', 0), 
          'placeholder:text-gray-150', 
          'focus:outline-none focus:border-blue-200', 
          disabled ? 'opacity-50 cursor-not-allowed' : '', 
          'transition-all duration-200', 
          'resize-vertical'
        ))}
        disabled={disabled}
        required={required}
        aria-invalid={!!error}
        {...props}
      />
      
      {error && <p className={ub(cls('mt-1 text-sm text-red-180'))}>{error}</p>}
      {hint && !error && <p className={ub(cls('mt-1 text-xs text-gray-150'))}>{hint}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

// ==================== SELECT ====================

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: InputSize;
  fullWidth?: boolean;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  hint,
  size = 'md',
  fullWidth = true,
  options,
  placeholder,
  className = '',
  disabled = false,
  required = false,
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const sizeClasses = {
    sm: cls('p-1.5', 'text-sm', 'rounded-1.5'),
    md: cls('p-2', 'text-base', 'rounded-2'),
    lg: cls('p-2.5', 'text-lg', 'rounded-2.5'),
  };

  return (
    <div className={cls(fullWidth ? 'w-full' : '', className)}>
      {label && (
        <label htmlFor={selectId} className={ub(cls('block mb-1', size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'))}>
          {label}{required && <span className={ub('text-red-180')}> *</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={ub(cls(
            'w-full appearance-none', 
            sizeClasses[size], 
            error ? borderColor('red', 180) : borderColor('gray', 150), 
            'border', 
            bgColor('gray', 0), 
            'focus:outline-none focus:border-blue-200', 
            disabled ? 'opacity-50 cursor-not-allowed' : '', 
            'transition-all duration-200', 
            'pr-8'
          ))}
          disabled={disabled}
          required={required}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <span className={ub(cls('absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none'))}>▼</span>
      </div>
      
      {error && <p className={ub(cls('mt-1 text-sm text-red-180'))}>{error}</p>}
      {hint && !error && <p className={ub(cls('mt-1 text-xs text-gray-150'))}>{hint}</p>}
    </div>
  );
});

Select.displayName = 'Select';

// ==================== CHECKBOX ====================

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  error?: string;
  size?: InputSize;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  error,
  size = 'md',
  className = '',
  disabled = false,
  id,
  ...props
}, ref) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

  return (
    <div className={cls('flex items-start gap-2', className)}>
      <input
        ref={ref}
        type="checkbox"
        id={checkboxId}
        className={ub(cls(
          sizeClasses[size], 
          'rounded-1', 
          borderColor('gray', 150), 
          'focus:ring-2 focus:ring-blue-200 focus:ring-offset-2', 
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer', 
          'transition-all'
        ))}
        disabled={disabled}
        {...props}
      />
      {label && (
        <label 
          htmlFor={checkboxId} 
          className={ub(cls(
            size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg', 
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          ))}
        >
          {label}
        </label>
      )}
      {error && <p className={ub(cls('text-sm text-red-180'))}>{error}</p>}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

// ==================== RADIO ====================

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  size?: InputSize;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(({
  label,
  size = 'md',
  className = '',
  disabled = false,
  id,
  ...props
}, ref) => {
  const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
  
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

  return (
    <div className={cls('flex items-center gap-2', className)}>
      <input
        ref={ref}
        type="radio"
        id={radioId}
        className={ub(cls(
          sizeClasses[size], 
          'rounded-full', 
          borderColor('gray', 150), 
          'focus:ring-2 focus:ring-blue-200 focus:ring-offset-2', 
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer', 
          'transition-all'
        ))}
        disabled={disabled}
        {...props}
      />
      {label && (
        <label 
          htmlFor={radioId} 
          className={ub(cls(
            size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg', 
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          ))}
        >
          {label}
        </label>
      )}
    </div>
  );
});

Radio.displayName = 'Radio';

// ==================== FORM GROUP ====================

export interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({ children, className = '' }) => {
  return <div className={cls('space-y-4', className)}>{children}</div>;
};

FormGroup.displayName = 'FormGroup';

// ==================== EXPORT ====================

export const Form = {
  Input, Textarea, Select, Checkbox, Radio, FormGroup
};

export default Form;