import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../lib/cn';
import { Spinner } from './Spinner';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md font-medium',
    // 150-300ms is the band where a state change reads as responsive without
    // feeling sluggish. Only colour and transform animate: animating width or
    // height would force layout on every frame.
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out',
    // A press that moves is a press the user believes registered, which is
    // what makes a slow network feel less broken than it is.
    'active:scale-[0.98] motion-reduce:active:scale-100',
    'disabled:pointer-events-none disabled:opacity-50',
    'cursor-pointer disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:bg-primary/90',
        secondary:
          'border border-border-default bg-surface-raised text-fg hover:bg-surface-raised/70',
        outline: 'border border-border-strong bg-transparent text-fg hover:bg-surface-raised',
        ghost: 'bg-transparent text-fg-muted hover:bg-surface-raised hover:text-fg',
        danger: 'bg-danger text-danger-fg hover:bg-danger/90',
        link: 'bg-transparent text-primary-text underline-offset-4 hover:underline',
      },
      size: {
        // 44px tall. The WCAG target-size minimum is 24px and the practical
        // floor on a phone is 44px; anything smaller is a mis-tap generator.
        md: 'h-11 px-4 text-sm',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-12 px-6 text-base',
        // Square variants for icon-only buttons. These REQUIRE an aria-label;
        // there is no visible text to fall back on.
        icon: 'size-11',
        'icon-sm': 'size-9',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render the styles onto the child element instead of a `<button>`.
   * Use for links that should look like buttons, so the element stays an
   * anchor and keeps middle-click, right-click and copy-link behaviour.
   */
  asChild?: boolean;
  /**
   * Shows a spinner and blocks interaction. The button keeps its width so the
   * layout does not jump the instant a form is submitted.
   */
  loading?: boolean;
  /** Announced while `loading`. Defaults to a generic message. */
  loadingLabel?: string;
  children?: ReactNode;
}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  asChild = false,
  loading = false,
  loadingLabel = 'Loading',
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      // An omitted `type` inside a form defaults to "submit", which is how a
      // "Cancel" button ends up submitting the form it was meant to abandon.
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner label={loadingLabel} /> : null}
      {/*
        Slottable marks which child the `asChild` slot should merge onto. With
        a bare fragment, Slot sees two children — the spinner and the label —
        and refuses to merge at all.
      */}
      <Slottable>{children}</Slottable>
    </Component>
  );
}

export { buttonVariants };
