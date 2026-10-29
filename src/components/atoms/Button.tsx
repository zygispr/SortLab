import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `primary`: filled with the focus color (Start, Generate). `secondary` (default):
   * bordered surface. `quiet`: no border or background ("Not now").
   */
  variant?: 'primary' | 'secondary' | 'quiet';
}

const VARIANT_CLASS = {
  primary: styles.primary,
  secondary: styles.button,
  quiet: styles.quiet,
} as const;

/**
 * The one button of the interface (FR-007). Renders a native `<button>`, `type="button"`
 * unless another `type` is passed; every other prop, including `disabled` (dimmed by
 * global.css) and `onClick`, goes to the element. A passed `className` is appended.
 */
export function Button({
  variant = 'secondary',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  const variantClass = VARIANT_CLASS[variant];
  return (
    <button
      type={type}
      className={className ? [variantClass, className].join(' ') : variantClass}
      {...props}
    />
  );
}
