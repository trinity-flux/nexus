/**
 * The auth feature's public surface. Everything outside imports from here.
 */

export {
  signIn,
  signInWithDiscord,
  signOut,
  signUp,
  watchSession,
} from './application/authCommands';
export { type AuthEpicDependencies, authEpic } from './application/authEpics';
export { type AuthState, authActions, authReducer } from './application/authSlice';

export {
  type AuthFailure,
  asMemberId,
  type Credentials,
  type CurrentMember,
  canPost,
  isModerator,
  type MemberId,
  type MemberRole,
  MINIMUM_PASSWORD_LENGTH,
  type Session,
} from './domain/entities';
export type { AuthRepository, AuthResult } from './domain/ports';

export { InMemoryAuthRepository } from './infrastructure/InMemoryAuthRepository';

export { UserMenu } from './presentation/UserMenu';
export { type AuthView, useAuth, useAuthDispatch } from './presentation/useAuth';
