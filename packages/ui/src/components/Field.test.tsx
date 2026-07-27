import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Field } from './Field';
import { Input } from './Input';

describe('Field', () => {
  it('associates the label with the control', () => {
    render(<Field label="Username">{(field) => <Input {...field} />}</Field>);

    // getByLabelText only succeeds when the association actually exists, which
    // is the whole point of the render-prop shape.
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('points aria-describedby at the hint', () => {
    render(
      <Field hint="Letters and numbers only." label="Username">
        {(field) => <Input {...field} />}
      </Field>,
    );

    const input = screen.getByLabelText('Username');
    const describedBy = input.getAttribute('aria-describedby');

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      'Letters and numbers only.',
    );
  });

  it('marks the control invalid and describes it with the error', () => {
    render(
      <Field error="That username is taken." label="Username">
        {(field) => <Input {...field} />}
      </Field>,
    );

    const input = screen.getByLabelText('Username');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('describes the control with both the hint and the error when both are present', () => {
    render(
      <Field error="Too short." hint="At least 3 characters." label="Username">
        {(field) => <Input {...field} />}
      </Field>,
    );

    const ids =
      screen.getByLabelText('Username').getAttribute('aria-describedby')?.split(' ') ?? [];

    expect(ids).toHaveLength(2);
    const text = ids.map((id) => document.getElementById(id)?.textContent).join(' ');
    expect(text).toContain('At least 3 characters.');
    expect(text).toContain('Too short.');
  });

  it('leaves aria-describedby off when there is nothing to describe', () => {
    render(<Field label="Username">{(field) => <Input {...field} />}</Field>);

    expect(screen.getByLabelText('Username')).not.toHaveAttribute('aria-describedby');
  });

  it('announces the error rather than only showing it', () => {
    render(
      <Field error="That username is taken." label="Username">
        {(field) => <Input {...field} />}
      </Field>,
    );

    expect(screen.getByText('That username is taken.')).toHaveAttribute('aria-live', 'polite');
  });

  it('spells out "required" for screen readers instead of relying on the asterisk', () => {
    render(
      <Field label="Username" required>
        {(field) => <Input {...field} />}
      </Field>,
    );

    expect(screen.getByText('(required)')).toBeInTheDocument();
  });
});
