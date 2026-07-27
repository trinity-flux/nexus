/**
 * Who is signed in, as the application understands it.
 *
 * Deliberately narrow. The email address is not here: the forum never displays
 * it, and a value that is never rendered has no business in a store that ends
 * up in a devtools export or a bug report.
 */

export type MemberId = string & { readonly __brand: 'MemberId' };

export function asMemberId(value: string): MemberId {
  return value as MemberId;
}

export type MemberRole = 'member' | 'moderator' | 'admin';

export interface CurrentMember {
  id: MemberId;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: MemberRole;
  /** Set while suspended. Write permissions are withheld until it passes. */
  bannedUntil: string | null;
}

export interface Session {
  member: CurrentMember;
  /** When the access token stops working, so the UI can refresh ahead of it. */
  expiresAt: string;
}

/** Whether this member may post at all right now. */
export function canPost(member: CurrentMember | null): boolean {
  if (!member) {
    return false;
  }
  if (!member.bannedUntil) {
    return true;
  }
  return new Date(member.bannedUntil).getTime() <= Date.now();
}

export function isModerator(member: CurrentMember | null): boolean {
  return member?.role === 'moderator' || member?.role === 'admin';
}

export interface Credentials {
  email: string;
  password: string;
}

/**
 * Why a sign-in attempt failed, as a value rather than a message.
 *
 * The UI turns these into translated strings; the domain never holds English
 * prose, or the same failure would need a different branch per language.
 */
export type AuthFailure =
  | 'invalid-credentials'
  | 'email-taken'
  | 'weak-password'
  | 'network'
  | 'unknown';

export const MINIMUM_PASSWORD_LENGTH = 8;
