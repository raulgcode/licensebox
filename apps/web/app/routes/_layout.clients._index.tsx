import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { data, useLoaderData, useNavigate, Form, Link } from 'react-router';
import { createAuthenticatedApi } from '@/lib/api';
import type { ClientWithLicensesDto } from '@licensebox/shared';
import { isAxiosError } from 'axios';

export async function loader({ request }: LoaderFunctionArgs) {
  const api = await createAuthenticatedApi(request);
  const { data: clients } = await api.get<ClientWithLicensesDto[]>('/clients?includeLicenses=true');
  return data({ clients });
}

export async function action({ request }: ActionFunctionArgs) {
  const api = await createAuthenticatedApi(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'delete') {
      const id = formData.get('id') as string;
      await api.delete(`/clients/${id}`);
      return data({ success: true, message: 'Client deleted successfully' });
    }

    if (intent === 'toggle-active') {
      const id = formData.get('id') as string;
      await api.post(`/clients/${id}/toggle-active`);
      return data({ success: true, message: 'Client status updated' });
    }
  } catch (error) {
    if (isAxiosError(error)) {
      return data(
        { success: false, error: error.response?.data?.message || 'An error occurred' },
        { status: error.response?.status || 500 },
      );
    }
    throw error;
  }

  return data({ success: false, error: 'Invalid action' }, { status: 400 });
}

export default function ClientsPage() {
  const { clients } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus clientes y sus licencias</p>
        </div>
        <Link
          to="/clients/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:bg-primary/90 transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Agregar Cliente
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-sm text-muted-foreground">Total Clientes</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.filter((c) => c.isActive).length}</p>
              <p className="text-sm text-muted-foreground">Clientes Activos</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {clients.reduce(
                  (acc, c) => acc + (c.licenses?.filter((l) => l.isActive).length || 0),
                  0,
                )}
              </p>
              <p className="text-sm text-muted-foreground">Licencias Activas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Licencias
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Creado
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/clients/${client.id}`} className="group flex flex-col">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {client.name}
                      </span>
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {client.description || 'Sin descripción'}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                        client.isActive
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${client.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                      ></span>
                      {client.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/clients/${client.id}/licenses`}
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <span className="font-semibold text-foreground">
                        {client.licenses?.filter((l) => l.isActive).length || 0}
                      </span>
                      <span>/</span>
                      <span>{client.licenses?.length || 0}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(client.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <Link
                        to={`/clients/${client.id}/edit`}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Editar"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </Link>
                      <Form method="post" className="inline">
                        <input type="hidden" name="intent" value="toggle-active" />
                        <input type="hidden" name="id" value={client.id} />
                        <button
                          type="submit"
                          className="p-2 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          title={client.isActive ? 'Desactivar' : 'Activar'}
                        >
                          {client.isActive ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                              <line x1="12" x2="12" y1="2" y2="12" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <path d="M12 2v4" />
                              <path d="m16.2 7.8 2.9-2.9" />
                              <path d="M18 12h4" />
                              <path d="m16.2 16.2 2.9 2.9" />
                              <path d="M12 18v4" />
                              <path d="m4.9 19.1 2.9-2.9" />
                              <path d="M2 12h4" />
                              <path d="m4.9 4.9 2.9 2.9" />
                            </svg>
                          )}
                        </button>
                      </Form>
                      <Form
                        method="post"
                        className="inline"
                        onSubmit={(e) => {
                          if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={client.id} />
                        <button
                          type="submit"
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Eliminar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" x2="10" y1="11" y2="17" />
                            <line x1="14" x2="14" y1="11" y2="17" />
                          </svg>
                        </button>
                      </Form>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-8 w-8 text-muted-foreground"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" x2="19" y1="8" y2="14" />
                          <line x1="22" x2="16" y1="11" y2="11" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">No hay clientes</h3>
                        <p className="text-muted-foreground mt-1">
                          ¡Comienza agregando tu primer cliente!
                        </p>
                      </div>
                      <Link
                        to="/clients/new"
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Crear Cliente
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
