import type { LoaderFunctionArgs } from 'react-router';
import { data, useLoaderData, Link } from 'react-router';
import { createAuthenticatedApi } from '@/lib/api';
import type { ClientWithLicensesDto } from '@licensebox/shared';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const api = await createAuthenticatedApi(request);
  const { data: client } = await api.get<ClientWithLicensesDto>(
    `/clients/${params.id}?includeLicenses=true`,
  );
  return data({ client });
}

export default function ClientDetailPage() {
  const { client } = useLoaderData<typeof loader>();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/clients" className="text-blue-600 hover:text-blue-800">
          ← Volver a Clientes
        </Link>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <span
            className={`mt-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              client.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {client.isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <Link
          to={`/clients/${client.id}/edit`}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Editar Cliente
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Detalles</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Descripción</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {client.description || 'Sin descripción'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Creado</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(client.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Última Actualización</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(client.updatedAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Total de Licencias</dt>
            <dd className="mt-1 text-sm text-gray-900">{client.licenses.length}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Licencias</h2>
          <div className="flex gap-4">
            <Link
              to={`/clients/${client.id}/licenses`}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              Ver todas
            </Link>
            <Link
              to={`/clients/${client.id}/licenses/new`}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Agregar Licencia
            </Link>
          </div>
        </div>
        {client.licenses.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clave
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expira
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {client.licenses.map((license) => (
                <tr key={license.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    <Link
                      to={`licenses/${license.id}/edit`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {license.key}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{license.product}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        license.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {license.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Nunca'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-4 text-center text-gray-500">
            No se encontraron licencias para este cliente.
          </div>
        )}
      </div>
    </div>
  );
}
