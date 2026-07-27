import { type ReactNode, useId } from 'react';

import { cn } from '../lib/cn';

export interface FieldRenderProps {
  /** Wire onto the control: `<input {...field} />`. */
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
}

export interface FieldProps {
  /**
   * Always visible. A placeholder is not a label: it disappears the moment
   * someone types, taking the only description of the field with it, and
   * screen readers treat it as a hint rather than a name.
   */
  label: ReactNode;
  /** Shown under the control, before any error. */
  hint?: ReactNode;
  /** Shown under the control in the danger colour, and announced. */
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: (field: FieldRenderProps) => ReactNode;
}

/**
 * Label, hint and error around a form control, with the accessibility wiring
 * done once instead of at every call site.
 *
 * The render-prop shape exists so the ids are generated here and handed to the
 * control — the association cannot be forgotten, which is the usual way
 * `aria-describedby` ends up pointing at nothing.
 */
export function Field({ label, hint, error, required = false, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="font-medium text-fg text-sm" htmlFor={id}>
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-0.5 text-danger-text">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </label>

      {children({
        id,
        'aria-describedby': describedBy === '' ? undefined : describedBy,
        'aria-invalid': error ? true : undefined,
      })}

      {hint ? (
        <p className="text-fg-subtle text-xs" id={hintId}>
          {hint}
        </p>
      ) : null}

      {/*
        The error sits next to the field it belongs to, not in a summary at the
        top of the form, and it is a live region so it is announced when it
        appears rather than only when focus happens to land on the control.
      */}
      {error ? (
        <p aria-live="polite" className="text-danger-text text-xs" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
