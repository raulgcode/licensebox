import { redirect } from 'react-router';

export async function loader() {
  return redirect('/clients');
}

export default function DashboardHome() {
  return null;
}
