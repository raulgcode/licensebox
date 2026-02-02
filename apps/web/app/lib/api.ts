import axios from 'axios';
import { authCookie } from '../cookies.server';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Create an authenticated API client for server-side requests
 * Pass the request object from loader/action to forward the auth cookie
 */
export async function createAuthenticatedApi(request: Request) {
  const cookieHeader = request.headers.get('Cookie');
  const token = await authCookie.parse(cookieHeader);
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    withCredentials: true,
  });
}
