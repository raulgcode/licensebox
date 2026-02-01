import { Outlet, redirect, useLoaderData } from 'react-router';
import { createAuthenticatedApi } from '@/lib/api';
import { getAuthToken } from '@/lib/auth.server';
import { userContext } from '@/context';
import { isAxiosError } from 'axios';
import type { Route } from '../+types/root';
import { Navbar } from '@/components/navbar/navbar';

// Authentication middleware - validates session and adds user to context
const authMiddleware: Route.MiddlewareFunction = async ({ request, context }) => {
  const token = await getAuthToken(request);

  if (!token) {
    throw redirect('/login');
  }

  try {
    const api = await createAuthenticatedApi(request);
    const { data } = await api.get('/auth/me');
    context.set(userContext, data);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      throw redirect('/login');
    }
    throw error;
  }
};

// Apply authentication middleware to all dashboard routes
export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export async function loader({ context }: Route.LoaderArgs) {
  // User is guaranteed to exist thanks to authMiddleware
  const user = context.get(userContext);
  return { user };
}

export default function Layout() {
  const { user } = useLoaderData<typeof loader>();

  // User is guaranteed to exist thanks to authMiddleware
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
