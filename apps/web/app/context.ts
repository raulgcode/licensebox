import { createContext } from 'react-router';
import type { AuthenticatedUser } from '@licensebox/shared';

/**
 * Context for authenticated user data
 * Used by middleware to pass user info to loaders/actions
 */
export const userContext = createContext<AuthenticatedUser | null>(null);
