import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.scss';

type ButtonVariant = 'primary' | 'secondary' | 'quiet';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `primary`: filled with the focus color (Start, Generate). `secondary` (default):
   * bordered surface. `quiet`: no border or background ("Not now").
   */
  variant?: ButtonVariant;
}

const VARIANT_CLASS = {
  primary: styles.primary,
  secondary: styles.button,
  quiet: styles.quiet,
} as const;

/**
 * The class that gives an element the look of the given button variant, for an element
 * that must not be a `<button>` (the file picker's label). The Button atom stays the one
 * place buttons are styled. Typed `string | undefined` because CSS module class maps are
 * index signatures; every variant's class exists in Button.module.scss.
 */
export function buttonClass(variant: ButtonVariant = 'secondary'): string | undefined {
  return VARIANT_CLASS[variant];
}

/**
 * The one button of the interface (FR-007). Renders a native `<button>`, `type="button"`
 * unless another `type` is passed; every other prop, including `disabled` (dimmed by
 * global.scss) and `onClick`, goes to the element. A passed `className` is appended.
 */
export function Button({
  variant = 'secondary',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  const variantClass = buttonClass(variant);
  return (
    <button
      type={type}
      className={className ? [variantClass, className].join(' ') : variantClass}
      {...props}
    />
  );
}
