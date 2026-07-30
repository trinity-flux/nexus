/**
 * The auth feature's route components.
 *
 * Separate from `index.ts` for the same reason as the forum's: the store
 * imports the reducer and the epic eagerly, so anything sharing that barrel is
 * in the initial bundle whether the router asks for it lazily or not.
 *
 * `UserMenu` stays in `index.ts` on purpose. It is in the header on every page,
 * so deferring it would only add a request to the critical path.
 */

export { SignInPage } from './presentation/SignInPage';
