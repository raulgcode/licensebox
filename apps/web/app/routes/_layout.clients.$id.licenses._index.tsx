import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { data, useLoaderData, Form, Link, useNavigation, useFetcher } from 'react-router';
import { createAuthenticatedApi, api } from '@/lib/api';
import type { ClientWithLicensesDto, LicenseDto, PublicKeyResponseDto } from '@licensebox/shared';
import { isAxiosError } from 'axios';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const authApi = await createAuthenticatedApi(request);
  const [{ data: client }, { data: publicKeyData }] = await Promise.all([
    authApi.get<ClientWithLicensesDto>(`/clients/${params.id}?includeLicenses=true`),
    api.get<PublicKeyResponseDto>('/licenses/offline/public-key'),
  ]);
  return data({ client, publicKey: publicKeyData.publicKey });
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

    if (intent === 'generate-offline-token') {
      const licenseId = formData.get('licenseId') as string;
      const response = await api.post<{ success: boolean; token?: string; message?: string }>(
        '/licenses/offline/generate',
        { licenseId },
      );
      if (response.data.success && response.data.token) {
        return data({
          success: true,
          message: 'Token offline generado correctamente',
          offlineToken: response.data.token,
          licenseId,
        });
      }
      return data({
        success: false,
        error: response.data.message || 'Error al generar token',
      });
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
  const { client, publicKey } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const fetcher = useFetcher<{
    success?: boolean;
    offlineToken?: string;
    licenseId?: string;
    error?: string;
  }>();
  const isSubmitting = navigation.state === 'submitting';

  // State for offline token modal
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [currentLicenseId, setCurrentLicenseId] = useState<string | null>(null);
  const [currentLicenseKey, setCurrentLicenseKey] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPublicKey, setCopiedPublicKey] = useState(false);

  // Handle fetcher response for offline token generation
  useEffect(() => {
    if (fetcher.data?.offlineToken) {
      setCurrentToken(fetcher.data.offlineToken);
      if (fetcher.data.licenseId) {
        setCurrentLicenseId(fetcher.data.licenseId);
        const license = client.licenses.find((l) => l.id === fetcher.data!.licenseId);
        if (license) setCurrentLicenseKey(license.key);
      }
      setTokenModalOpen(true);
      setCopiedToken(false);
    }
  }, [fetcher.data, client.licenses]);

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleShowExistingToken = (token: string, licenseId: string, licenseKey: string) => {
    setCurrentToken(token);
    setCurrentLicenseId(licenseId);
    setCurrentLicenseKey(licenseKey);
    setTokenModalOpen(true);
    setCopiedToken(false);
  };

  const handleRegenerateToken = () => {
    if (currentLicenseId) {
      const formData = new FormData();
      formData.append('intent', 'generate-offline-token');
      formData.append('licenseId', currentLicenseId);
      fetcher.submit(formData, { method: 'post' });
    }
  };

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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div className="bg-muted/30 rounded-lg p-3 col-span-2 md:col-span-3 lg:col-span-1">
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          ID
                        </dt>
                        <dd className="text-xs font-mono truncate" title={license.id}>
                          {license.id}
                        </dd>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Producto
                        </dt>
                        <dd className="text-sm font-medium">{license.product}</dd>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Usuarios
                        </dt>
                        <dd className="text-sm font-medium">{license.maxUsers || 1}</dd>
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

                    {/* Offline Token Status */}
                    {license.offlineToken && (
                      <div className="mt-4 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3"
                          >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                          </svg>
                          Token Offline Disponible
                        </span>
                        <button
                          type="button"
                          onClick={() => handleShowExistingToken(license.offlineToken!, license.id, license.key)}
                          className="text-xs text-primary hover:underline"
                        >
                          Ver Token
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2 lg:min-w-30">
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

                    {/* Generate/View Offline Token Button */}
                    {license.offlineToken ? (
                      <button
                        type="button"
                        onClick={() => handleShowExistingToken(license.offlineToken!, license.id, license.key)}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-400 dark:hover:bg-purple-950/50 transition-colors"
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
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                        </svg>
                        Ver Token
                      </button>
                    ) : (
                      <fetcher.Form method="post" className="flex-1 lg:flex-none">
                        <input type="hidden" name="intent" value="generate-offline-token" />
                        <input type="hidden" name="licenseId" value={license.id} />
                        <button
                          type="submit"
                          disabled={fetcher.state === 'submitting'}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-400 dark:hover:bg-purple-950/50 transition-colors disabled:opacity-50"
                        >
                          {fetcher.state === 'submitting' ? (
                            <>
                              <svg
                                className="animate-spin h-4 w-4"
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
                              Generando...
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
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                              </svg>
                              Generar Token
                            </>
                          )}
                        </button>
                      </fetcher.Form>
                    )}

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

      {/* Offline Token Modal */}
      <Dialog open={tokenModalOpen} onOpenChange={setTokenModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-purple-600">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                </svg>
              </span>
              Token de Licencia Offline
            </DialogTitle>
            <DialogDescription>
              Todos los datos necesarios para validar la licencia sin conexión a internet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* License metadata */}
            {(currentLicenseId || currentLicenseKey) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentLicenseId && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">License ID</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono truncate flex-1 text-foreground">{currentLicenseId}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentLicenseId, setCopiedKey)}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        title="Copiar ID"
                      >
                        {copiedKey ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-green-500"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {currentLicenseKey && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">License Key</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono truncate flex-1 text-foreground">{currentLicenseKey}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentLicenseKey, setCopiedPublicKey)}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        title="Copiar Key"
                      >
                        {copiedPublicKey ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-green-500"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Offline Token */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Token Offline</p>
                <button
                  type="button"
                  onClick={() => currentToken && copyToClipboard(currentToken, setCopiedToken)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedToken ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-green-500"><polyline points="20 6 9 17 4 12" /></svg>
                      <span className="text-green-600">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <div className="bg-muted rounded-md p-3 max-h-32 overflow-auto">
                <code className="text-xs font-mono break-all whitespace-pre-wrap text-foreground">{currentToken}</code>
              </div>
            </div>

            {/* Public Key */}
            {publicKey && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-amber-500">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clave Pública RSA</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(publicKey, setCopiedPublicKey)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedPublicKey ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-green-500"><polyline points="20 6 9 17 4 12" /></svg>
                        <span className="text-green-600">¡Copiada!</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-muted rounded-md p-3 max-h-28 overflow-auto">
                  <code className="text-xs font-mono break-all whitespace-pre-wrap text-foreground">{publicKey}</code>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Incrusta esta clave en tu aplicación .NET para verificar tokens sin conexión (RSA-SHA256 / SPKI PEM).
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setTokenModalOpen(false)}>
              Cerrar
            </Button>
            {currentLicenseId && (
              <Button
                variant="outline"
                onClick={handleRegenerateToken}
                disabled={fetcher.state === 'submitting'}
                className="gap-2"
              >
                {fetcher.state === 'submitting' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Regenerando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 16h5v5" />
                    </svg>
                    Regenerar Token
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
