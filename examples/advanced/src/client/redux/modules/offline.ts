// Imports
import { createReducer } from 'reduxsauce';

// Types
export enum Actions {
  OFFLINE_CACHE_LOADED = 'varan/offline/CACHE_LOADED',
  OFFLINE_CACHE_UPDATED = 'varan/offline/CACHE_UPDATED',
  OFFLINE_SERVICE_WORKER_ERROR = 'varan/offline/SERVICE_WORKER_ERROR',
}
interface IState {
  isCached: boolean;
  isOutdated: boolean;
  isOnline: boolean;
  lastError: Error | null;
}

// Initial state
export const initialState: IState = {
  isCached: false, // Has assets been cached and app ready for offline-mode?
  isOutdated: false, // Has assets been updated in the background and reload is necessary?
  isOnline: true, // TODO: Is the app online or offline?
  lastError: null,
};

// Reducers
export const reducers = createReducer<IState>( initialState, {
  [Actions.OFFLINE_CACHE_LOADED]: (state = initialState) => ({
    ...state,
    isCached: true,
  }),
  [Actions.OFFLINE_CACHE_UPDATED]: (state = initialState) => ({
    ...state,
    isOutdated: true,
  }),
  [Actions.OFFLINE_SERVICE_WORKER_ERROR]: (state = initialState, action) => ({
    ...state,
    lastError: action.payload,
  }),
});

// Actions
export const actions = {
  cacheLoaded: () => ({ type: Actions.OFFLINE_CACHE_LOADED }),
  cacheUpdated: () => ({ type: Actions.OFFLINE_CACHE_UPDATED }),
  serviceWorkerError: (err: Error) => ({ type: Actions.OFFLINE_SERVICE_WORKER_ERROR, payload: err, error: true }),
};
