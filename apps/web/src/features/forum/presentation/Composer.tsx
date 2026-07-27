import {
  Button,
  Card,
  Field,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@trinity-nexus/ui';
import { type FormEvent, useId, useState } from 'react';
import type { TranslationKey } from '@/shared/i18n/translations';
import { useI18n } from '@/shared/i18n/useI18n';

import {
  type DraftProblem,
  isSubmittable,
  validateBody,
  validateTopicDraft,
} from '../domain/drafts';
import { MarkdownBody } from './MarkdownBody';

const PROBLEM_MESSAGES: Record<DraftProblem, TranslationKey> = {
  'title-too-short': 'composer.error.titleTooShort',
  'title-too-long': 'composer.error.titleTooLong',
  'body-empty': 'composer.error.bodyEmpty',
  'body-too-long': 'composer.error.bodyTooLong',
};

export interface ComposerProps {
  /** A topic needs a title; a reply does not. */
  withTitle?: boolean;
  submitting?: boolean;
  onSubmit: (draft: { title: string; body: string }) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

/**
 * Writing a topic or a reply.
 *
 * Validation is shown only after the first submission attempt. Marking a field
 * invalid while it is still being filled in — which is what validating on
 * every keystroke does — tells someone they are wrong before they have
 * finished being right.
 */
export function Composer({
  withTitle = false,
  submitting = false,
  onSubmit,
  onCancel,
  submitLabel,
}: ComposerProps) {
  const { t } = useI18n();
  const previewId = useId();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [attempted, setAttempted] = useState(false);

  const problems = withTitle
    ? validateTopicDraft(title, body)
    : { title: null, body: validateBody(body) };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);

    if (!isSubmittable(problems)) {
      return;
    }

    onSubmit({ title: title.trim(), body });
  };

  const titleError = attempted && problems.title ? t(PROBLEM_MESSAGES[problems.title]) : undefined;
  const bodyError = attempted && problems.body ? t(PROBLEM_MESSAGES[problems.body]) : undefined;

  return (
    <Card className="p-4">
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        {withTitle ? (
          <Field
            label={t('composer.titleLabel')}
            required
            {...(titleError ? { error: titleError } : {})}
          >
            {(field) => (
              <Input
                {...field}
                // Above the 160 the domain allows, so the field reports the
                // problem rather than silently refusing the keystroke.
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('composer.titlePlaceholder')}
                value={title}
              />
            )}
          </Field>
        ) : null}

        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">{t('composer.write')}</TabsTrigger>
            <TabsTrigger value="preview">{t('composer.preview')}</TabsTrigger>
          </TabsList>

          <TabsContent className="pt-3" value="write">
            <Field
              hint={t('composer.bodyHint')}
              label={t('composer.bodyLabel')}
              required
              {...(bodyError ? { error: bodyError } : {})}
            >
              {(field) => (
                <Textarea
                  {...field}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={t('composer.bodyPlaceholder')}
                  rows={6}
                  value={body}
                />
              )}
            </Field>
          </TabsContent>

          <TabsContent className="pt-3" value="preview">
            {/*
              The preview renders through exactly the same path as a posted
              message. A preview that differs from the result is worse than no
              preview: it teaches the wrong thing about the syntax.
            */}
            {body.trim() === '' ? (
              <p className="py-6 text-center text-fg-subtle text-sm">
                {t('composer.emptyPreview')}
              </p>
            ) : (
              <MarkdownBody
                className="prose-forum min-h-24 rounded-md border border-border-default bg-bg p-3 text-fg text-sm"
                id={previewId}
                source={body}
              />
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-2">
          {onCancel ? (
            <Button onClick={onCancel} type="button" variant="ghost">
              {t('composer.cancel')}
            </Button>
          ) : null}

          <Button loading={submitting} loadingLabel={t('composer.saving')} type="submit">
            {submitLabel ?? t('composer.post')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
