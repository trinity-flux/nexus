import { useDispatch, useSelector } from 'react-redux';

import type { ForumState } from '../application/forumSlice';

/**
 * Store access scoped to this feature.
 *
 * The obvious thing is to import the app's typed `useAppSelector`, and it is
 * wrong: `app/` is the composition root, so a feature reaching into it points
 * the dependency arrow backwards. Biome rejects it, and the rule is right —
 * the feature would also gain the ability to read every other feature's slice.
 *
 * What a feature is allowed to know is that the root state has a `forum` key
 * holding its own state. That is exactly what this expresses, and nothing
 * more.
 */
interface RootStateWithForum {
  forum: ForumState;
}

export function useForumSelector<T>(select: (forum: ForumState) => T): T {
  return useSelector((state: RootStateWithForum) => select(state.forum));
}

export const useForumDispatch = useDispatch;
