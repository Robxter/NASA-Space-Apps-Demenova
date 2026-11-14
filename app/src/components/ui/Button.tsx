// Buttons are verbs ("Open lot", "Save lot"); no arrows. 48 px minimum height for outdoor, one-handed use.
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet';
  block?: boolean;
}

const VARIANTS = {
  primary: 'bg-primary text-on-primary',
  secondary: 'bg-surface-2 text-ink',
  quiet: 'bg-transparent text-leaf',
} as const;

export function Button({ variant = 'primary', block = false, className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 text-body font-semibold transition-[transform,opacity] duration-[120ms] ease-standard active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${VARIANTS[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  );
}
