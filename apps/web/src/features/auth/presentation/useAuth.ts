import { useDispatch, useSelector } from 'react-redux';
import type { AuthState } from '../application/authSlice';
import { canPost, isModerator } from '../domain/entities';

/**
 * Store access scoped to this feature. See the note in the forum's equivalent:
 * reaching for the app's typed hooks would point the dependency arrow back at
 * the composition root.
 */
interface RootStateWithAuth {
  auth: AuthState;
}

export function useAuthSelector<T>(select: (auth: AuthState) => T): T {
  return useSelector((state: RootStateWithAuth) => select(state.auth));
}

export const useAuthDispatch = useDispatch;

export interface AuthView {
  member: AuthState['member'];
  status: AuthState['status'];
  submitting: boolean;
  failure: AuthState['failure'];
  /** True only once the stored session has actually been checked. */
  isReady: boolean;
  isSignedIn: boolean;
  isModerator: boolean;
  /** False for a signed-out visitor and for a suspended member. */
  canPost: boolean;
}

export function useAuth(): AuthView {
  const auth = useAuthSelector((state) => state);

  return {
    member: auth.member,
    status: auth.status,
    submitting: auth.submitting,
    failure: auth.failure,
    isReady: auth.status !== 'unknown',
    isSignedIn: auth.status === 'signed-in',
    isModerator: isModerator(auth.member),
    canPost: canPost(auth.member),
  };
}
