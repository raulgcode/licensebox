import { redirect } from 'react-router';
import { authCookie } from '../cookies.server';

/**
 * Get the auth token from cookies
 */
export async function getAuthToken(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get('Cookie');
  return authCookie.parse(cookieHeader);
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth(request: Request) {
  const token = await getAuthToken(request);

  if (!token) {
    throw redirect('/login');
  }

  return token;
}

/**
 * Optional auth - returns token if exists, null otherwise
 */
export async function optionalAuth(request: Request) {
  return getAuthToken(request);
}
