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

function getLicenseCardStyles(license: { isActive: boolean }, isExpired: boolean): {
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link to={`/clients/${client.id}`} className="text-blue-600 hover:text-blue-800">
          ← Volver a {client.name}
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Licencias de {client.name}</h1>
          <p className="text-gray-500 mt-1">
            {client.licenses.length} licencia{client.licenses.length !== 1 ? 's' : ''} registrada
            {client.licenses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to={`/clients/${client.id}/licenses/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Nueva Licencia
        </Link>
      </div>

      {client.licenses.length > 0 ? (
        <div className="space-y-4">
          {client.licenses.map((license) => {
            const expStatus = getExpirationStatus(license.expiresAt);
            const cardStyles = getLicenseCardStyles(license, expStatus.isExpired);
            return (
              <div
                key={license.id}
                className={`shadow rounded-lg p-6 border-l-4 ${cardStyles.borderColor} ${cardStyles.bgColor} ${cardStyles.opacity} transition-all`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-lg font-mono bg-gray-100 px-3 py-1 rounded">
                        {license.key}
                      </code>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          license.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {license.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${expStatus.className}`}
                      >
                        {expStatus.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase">Producto</dt>
                        <dd className="mt-1 text-sm text-gray-900">{license.product}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase">
                          ID de Máquina
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">
                          {license.machineId || (
                            <span className="text-gray-400 italic">Sin asignar</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase">Creada</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatDate(license.createdAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase">
                          Última Actualización
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatDate(license.updatedAt)}
                        </dd>
                      </div>
                    </div>

                    {license.expiresAt && (
                      <div className="mt-4">
                        <dt className="text-xs font-medium text-gray-500 uppercase">
                          Fecha de Expiración
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatDate(license.expiresAt)}
                        </dd>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Link
                      to={`/clients/${client.id}/licenses/${license.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900 text-sm text-center"
                    >
                      Editar
                    </Link>
                    <Form method="post" className="inline">
                      <input type="hidden" name="intent" value="toggle-active" />
                      <input type="hidden" name="licenseId" value={license.id} />
                      <input type="hidden" name="currentStatus" value={String(license.isActive)} />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="text-yellow-600 hover:text-yellow-900 text-sm disabled:opacity-50"
                      >
                        {license.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </Form>
                    {license.machineId && (
                      <Form method="post" className="inline">
                        <input type="hidden" name="intent" value="deactivate-machine" />
                        <input type="hidden" name="licenseKey" value={license.key} />
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="text-orange-600 hover:text-orange-900 text-sm disabled:opacity-50"
                        >
                          Desvincular Máquina
                        </button>
                      </Form>
                    )}
                    <Form
                      method="post"
                      className="inline"
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
                        className="text-red-600 hover:text-red-900 text-sm disabled:opacity-50"
                      >
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
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin licencias</h3>
          <p className="text-gray-500 mb-4">Este cliente aún no tiene licencias registradas.</p>
          <Link
            to={`/clients/${client.id}/licenses/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Crear Primera Licencia
          </Link>
        </div>
      )}
    </div>
  );
}
