import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { data, useLoaderData, Form, Link, useNavigation } from 'react-router';
import { createAuthenticatedApi } from '@/lib/api';
import type { ClientWithLicensesDto, LicenseDto } from '@licensebox/shared';
import { isAxiosError } from 'axios';

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
    if (intent === 'toggle-active') {
      const licenseId = formData.get('licenseId') as string;
      const currentStatus = formData.get('currentStatus') === 'true';
      await api.put(`/licenses/${licenseId}`, {
        isActive: !currentStatus,
      });
      return data({ success: true, message: 'Estado de licencia actualizado' });
    }

    if (intent === 'deactivate-machine') {
      const licenseKey = formData.get('licenseKey') as string;
      await api.post(`/licenses/${licenseKey}/deactivate`);
      return data({ success: true, message: 'Máquina desvinculada correctamente' });
    }

    if (intent === 'delete') {
      const licenseId = formData.get('licenseId') as string;
      await api.delete(`/licenses/${licenseId}`);
      return data({ success: true, message: 'Licencia eliminada correctamente' });
    }
  } catch (error) {
    if (isAxiosError(error)) {
      return data(
        { success: false, error: error.response?.data?.message || 'Ocurrió un error' },
        { status: error.response?.status || 500 },
      );
    }
    throw error;
  }

  return data({ success: false, error: 'Acción inválida' }, { status: 400 });
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getExpirationStatus(expiresAt: Date | string | null): {
  label: string;
  className: string;
  isExpired: boolean;
} {
  if (!expiresAt) {
    return { label: 'Sin expiración', className: 'bg-blue-100 text-blue-800', isExpired: false };
  }
  const now = new Date();
  const expDate = new Date(expiresAt);
  const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return { label: 'Expirada', className: 'bg-red-100 text-red-800', isExpired: true };
  }
  if (daysUntilExpiry <= 30) {
    return {
      label: `Expira en ${daysUntilExpiry} días`,
      className: 'bg-yellow-100 text-yellow-800',
      isExpired: false,
    };
  }
  return { label: formatDate(expiresAt), className: 'bg-gray-100 text-gray-800', isExpired: false };
}

function getLicenseCardStyles(
  license: { isActive: boolean },
  isExpired: boolean,
): {
  borderColor: string;
  bgColor: string;
  opacity: string;
} {
  if (!license.isActive || isExpired) {
    return {
      borderColor: 'border-red-400',
      bgColor: 'bg-red-50',
      opacity: 'opacity-75',
    };
  }
  return {
    borderColor: 'border-green-500',
    bgColor: 'bg-white',
    opacity: '',
  };
}

export default function ClientLicensesPage() {
  const { client } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const activeLicenses = client.licenses.filter((l) => l.isActive).length;
  const expiredLicenses = client.licenses.filter((l) => {
    if (!l.expiresAt) return false;
    return new Date(l.expiresAt) < new Date();
  }).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to={`/clients/${client.id}`}
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
          Volver a {client.name}
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Licencias</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las licencias de{' '}
            <span className="font-medium text-foreground">{client.name}</span>
          </p>
        </div>
        <Link
          to={`/clients/${client.id}/licenses/new`}
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
          Nueva Licencia
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
              <p className="text-2xl font-bold">{client.licenses.length}</p>
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
              <p className="text-sm text-muted-foreground">Activas</p>
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
              <p className="text-2xl font-bold">{expiredLicenses}</p>
              <p className="text-sm text-muted-foreground">Expiradas</p>
            </div>
          </div>
        </div>
      </div>

      {client.licenses.length > 0 ? (
        <div className="grid gap-4">
          {client.licenses.map((license) => {
            const expStatus = getExpirationStatus(license.expiresAt);
            const cardStyles = getLicenseCardStyles(license, expStatus.isExpired);
            return (
              <div
                key={license.id}
                className={`bg-card rounded-xl border shadow-sm p-6 transition-all hover:shadow-md ${
                  !license.isActive || expStatus.isExpired ? 'opacity-75' : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    {/* License Header */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded-lg font-semibold">
                        {license.key}
                      </code>
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
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${expStatus.className.replace('bg-', 'bg-').replace('-100', '-500/10').replace('-800', '-600')}`}
                      >
                        {expStatus.label}
                      </span>
                    </div>

                    {/* License Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Producto
                        </dt>
                        <dd className="text-sm font-medium">{license.product}</dd>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Máquina
                        </dt>
                        <dd className="text-sm font-mono truncate">
                          {license.machineId || (
                            <span className="text-muted-foreground italic">Sin asignar</span>
                          )}
                        </dd>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Creada
                        </dt>
                        <dd className="text-sm font-medium">{formatDate(license.createdAt)}</dd>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Expira
                        </dt>
                        <dd className="text-sm font-medium">
                          {license.expiresAt ? formatDate(license.expiresAt) : 'Nunca'}
                        </dd>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2 lg:min-w-[120px]">
                    <Link
                      to={`/clients/${client.id}/licenses/${license.id}/edit`}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
                      </svg>
                      Editar
                    </Link>
                    <Form method="post" className="flex-1 lg:flex-none">
                      <input type="hidden" name="intent" value="toggle-active" />
                      <input type="hidden" name="licenseId" value={license.id} />
                      <input type="hidden" name="currentStatus" value={String(license.isActive)} />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-background hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        {license.isActive ? (
                          <>
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
                            Desactivar
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
                              className="h-4 w-4"
                            >
                              <circle cx="12" cy="12" r="4" />
                              <path d="M12 2v2" />
                              <path d="M12 20v2" />
                              <path d="m4.93 4.93 1.41 1.41" />
                              <path d="m17.66 17.66 1.41 1.41" />
                              <path d="M2 12h2" />
                              <path d="M20 12h2" />
                              <path d="m6.34 17.66-1.41 1.41" />
                              <path d="m19.07 4.93-1.41 1.41" />
                            </svg>
                            Activar
                          </>
                        )}
                      </button>
                    </Form>
                    {license.machineId && (
                      <Form method="post" className="flex-1 lg:flex-none">
                        <input type="hidden" name="intent" value="deactivate-machine" />
                        <input type="hidden" name="licenseKey" value={license.key} />
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50 transition-colors disabled:opacity-50"
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
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                            <path d="M16 16h5v5" />
                          </svg>
                          Desvincular
                        </button>
                      </Form>
                    )}
                    <Form
                      method="post"
                      className="flex-1 lg:flex-none"
                      onSubmit={(e) => {
                        if (!confirm('¿Estás seguro de que deseas eliminar esta licencia?')) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="licenseId" value={license.id} />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
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
                        </svg>
                        Eliminar
                      </button>
                    </Form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl border shadow-sm p-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-muted-foreground"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Sin licencias</h3>
              <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                Este cliente aún no tiene licencias registradas. Crea una para comenzar.
              </p>
            </div>
            <Link
              to={`/clients/${client.id}/licenses/new`}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all mt-2"
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
  );
}
