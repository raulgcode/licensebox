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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Link
          to="/clients/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Agregar Cliente
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Licencias Activas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Creado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    to={`/clients/${client.id}`}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    {client.name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {client.description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      client.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {client.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    to={`/clients/${client.id}/licenses`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {client.licenses?.filter((l) => l.isActive).length || 0} de{' '}
                    {client.licenses?.length || 0}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {new Date(client.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <Link
                      to={`/clients/${client.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Editar
                    </Link>
                    <Form method="post" className="inline">
                      <input type="hidden" name="intent" value="toggle-active" />
                      <input type="hidden" name="id" value={client.id} />
                      <button type="submit" className="text-yellow-600 hover:text-yellow-900">
                        {client.isActive ? 'Desactivar' : 'Activar'}
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
                      <button type="submit" className="text-red-600 hover:text-red-900">
                        Eliminar
                      </button>
                    </Form>
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron clientes. ¡Crea tu primer cliente!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
