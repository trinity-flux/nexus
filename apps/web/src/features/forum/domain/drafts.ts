/**
 * Validation for what someone is about to post.
 *
 * Pure, and it mirrors the CHECK constraints in the database on purpose. The
 * database is the authority — it has to be, since it is not the only writer —
 * but discovering a 3-character minimum after a round trip and a rejected
 * request is a bad way to learn it.
 */

export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 160;
export const BODY_MAX_LENGTH = 20_000;

export type DraftProblem = 'title-too-short' | 'title-too-long' | 'body-empty' | 'body-too-long';

/** Trimmed first: a title of nothing but spaces is an empty title. */
export function validateTitle(title: string): DraftProblem | null {
  const trimmed = title.trim();

  if (trimmed.length < TITLE_MIN_LENGTH) {
    return 'title-too-short';
  }
  if (trimmed.length > TITLE_MAX_LENGTH) {
    return 'title-too-long';
  }
  return null;
}

export function validateBody(body: string): DraftProblem | null {
  const trimmed = body.trim();

  if (trimmed.length === 0) {
    return 'body-empty';
  }
  // Measured untrimmed, because that is what will be stored and what the
  // column limit applies to.
  if (body.length > BODY_MAX_LENGTH) {
    return 'body-too-long';
  }
  return null;
}

export interface TopicDraftProblems {
  title: DraftProblem | null;
  body: DraftProblem | null;
}

export function validateTopicDraft(title: string, body: string): TopicDraftProblems {
  return { title: validateTitle(title), body: validateBody(body) };
}

export function isSubmittable(problems: TopicDraftProblems): boolean {
  return problems.title === null && problems.body === null;
}
