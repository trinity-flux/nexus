import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from './store';

/**
 * Typed replacements for the raw react-redux hooks.
 *
 * Using these everywhere means a selector gets the real state shape and a
 * dispatch rejects an action the store cannot handle, instead of both being
 * `any` at the call site.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
