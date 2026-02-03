import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { data, useLoaderData, Link, useFetcher } from 'react-router';
import { useState, useEffect } from 'react';
import { createAuthenticatedApi } from '@/lib/api';
import type { ClientWithLicensesDto, RegenerateSecretResponseDto } from '@licensebox/shared';
import { ClientSecretModal } from '@/components/client-secret-modal';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const api = await createAuthenticatedApi(request);
  const { data: client } = await api.get<ClientWithLicensesDto>(
    `/clients/${params.id}?includeLicenses=true`,
  );
  return data({ client });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const api = await createAuthenticatedApi(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'regenerate-secret') {
      const { data: response } = await api.post<RegenerateSecretResponseDto>(
        `/clients/${params.id}/regenerate-secret`,
      );
      return data({ success: true, secretData: response });
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

export default function ClientDetailPage() {
  const { client } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const activeLicenses = client.licenses?.filter((l) => l.isActive).length || 0;
  const totalLicenses = client.licenses?.length || 0;

  // Handle successful secret regeneration
  const secretData =
    fetcher.data?.success && 'secretData' in fetcher.data ? fetcher.data.secretData : null;

  // Show modal when secret is regenerated
  useEffect(() => {
    if (secretData) {
      setShowSecretModal(true);
    }
  }, [secretData]);

  const handleRegenerateSecret = () => {
    setShowConfirmDialog(false);
    const formData = new FormData();
    formData.append('intent', 'regenerate-secret');
    fetcher.submit(formData, { method: 'post' });
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to="/clients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
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
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver a Clientes
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
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
            </div>
            <p className="text-muted-foreground mt-1">{client.description || 'Sin descripción'}</p>
          </div>
        </div>
        <Link
          to={`/clients/${client.id}/edit`}
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
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
          Editar Cliente
        </Link>
      </div>

      {/* Client Secret Section */}
      <div className="bg-card rounded-xl border shadow-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 shrink-0">
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
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Secreto del Cliente</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Este secreto se utiliza para la autenticación de la API. Por seguridad, el secreto
                está oculto.
              </p>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 font-mono text-sm">
                <code className="flex-1">••••••••-••••-••••-••••-••••••••••••</code>
              </div>
            </div>
          </div>
          <div>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(true)}
              disabled={fetcher.state === 'submitting'}
              className="whitespace-nowrap"
            >
              {fetcher.state === 'submitting' ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Regenerando...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 mr-2"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                  Regenerar Secreto
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-card rounded-xl border shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
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
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">¿Regenerar Secreto del Cliente?</h3>
                <p className="text-sm text-muted-foreground">
                  Esto invalidará el secreto actual. Cualquier aplicación que use el secreto antiguo
                  necesitará ser actualizada. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleRegenerateSecret}>
                Sí, Regenerar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Secret Modal */}
      {secretData && (
        <ClientSecretModal
          isOpen={showSecretModal}
          onClose={() => setShowSecretModal(false)}
          secret={secretData.secret}
          clientName={secretData.name}
          message={secretData.message}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <p className="text-2xl font-bold">{totalLicenses}</p>
              <p className="text-sm text-muted-foreground">Total Licencias</p>
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
              <p className="text-2xl font-bold">{activeLicenses}</p>
              <p className="text-sm text-muted-foreground">Licencias Activas</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
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
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {new Date(client.createdAt).toLocaleDateString('es-ES', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-muted-foreground">Fecha Creación</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {new Date(client.updatedAt).toLocaleDateString('es-ES', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-muted-foreground">Última Actualización</p>
            </div>
          </div>
        </div>
      </div>

      {/* Licenses Section */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Licencias</h2>
            <p className="text-sm text-muted-foreground">
              {totalLicenses} licencia{totalLicenses !== 1 ? 's' : ''} registrada
              {totalLicenses !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to={`/clients/${client.id}/licenses`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-background hover:bg-accent transition-colors"
            >
              Ver todas
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
            <Link
              to={`/clients/${client.id}/licenses/new`}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:bg-primary/90 transition-colors"
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
              Nueva Licencia
            </Link>
          </div>
        </div>
        {client.licenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Clave
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Expira
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {client.licenses.map((license) => (
                  <tr key={license.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        to={`licenses/${license.id}/edit`}
                        className="font-mono text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        {license.key}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{license.product}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                          license.isActive
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${license.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                        ></span>
                        {license.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {license.expiresAt
                        ? new Date(license.expiresAt).toLocaleDateString('es-ES')
                        : 'Sin expiración'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
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
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Sin licencias</h3>
                <p className="text-muted-foreground mt-1">
                  Este cliente aún no tiene licencias registradas.
                </p>
              </div>
              <Link
                to={`/clients/${client.id}/licenses/new`}
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
                Crear Primera Licencia
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
