/**
 * LoadState - Standardized type for async data loading states
 *
 * This type represents the four possible states of asynchronous data:
 * - idle: Initial state, no data loaded yet
 * - loading: Data is being fetched
 * - success: Data loaded successfully
 * - error: Failed to load data
 *
 * @example
 * ```ts
 * const [state, setState] = useState<LoadState<User>>({ status: 'idle' });
 *
 * // Start loading
 * setState({ status: 'loading' });
 *
 * // Success
 * setState({ status: 'success', data: user });
 *
 * // Error
 * setState({ status: 'error', error: 'Failed to fetch user' });
 * ```
 */
export type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

/**
 * Helper to create initial idle state
 */
export const idleState = <T>(): LoadState<T> => ({ status: 'idle' });

/**
 * Helper to create loading state
 */
export const loadingState = <T>(): LoadState<T> => ({ status: 'loading' });

/**
 * Helper to create success state
 */
export const successState = <T>(data: T): LoadState<T> => ({ status: 'success', data });

/**
 * Helper to create error state
 */
export const errorState = <T>(error: string): LoadState<T> => ({ status: 'error', error });
