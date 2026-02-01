import type { ActionFunctionArgs } from 'react-router';
import { redirect } from 'react-router';
import { authCookie } from '@/cookies.server';

export async function action({ request }: ActionFunctionArgs) {
  return redirect('/login', {
    headers: {
      'Set-Cookie': await authCookie.serialize('', { maxAge: 0 }),
    },
  });
}

export async function loader() {
  return redirect('/');
}
