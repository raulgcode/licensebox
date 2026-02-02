import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { Form, redirect, useActionData, useLoaderData, Link, data } from 'react-router';
import { getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useForm } from '@/hooks/useForm';
import { ErrorList } from '@/components/errorList';
import { createAuthenticatedApi } from '@/lib/api';
import type { ClientDto, LicenseDto } from '@licensebox/shared';
import { isAxiosError } from 'axios';

const schema = z.object({
  key: z
    .string({ required_error: 'La clave de licencia es obligatoria' })
    .min(1, { message: 'La clave de licencia es obligatoria' }),
  product: z
    .string({ required_error: 'El producto es obligatorio' })
    .min(1, { message: 'El producto es obligatorio' }),
  machineId: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.preprocess((val) => val === 'on' || val === true, z.boolean().default(true)),
});

function formatDateForInput(date: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().slice(0, 16);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const api = await createAuthenticatedApi(request);
  const [clientResponse, licenseResponse] = await Promise.all([
    api.get<ClientDto>(`/clients/${params.id}`),
    api.get<LicenseDto>(`/licenses/${params.licenseId}`),
  ]);
  return data({ client: clientResponse.data, license: licenseResponse.data });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const api = await createAuthenticatedApi(request);
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { key, product, machineId, expiresAt, isActive } = submission.value;

  try {
    await api.put(`/licenses/${params.licenseId}`, {
      key: key.trim(),
      product: product.trim(),
      machineId: machineId?.trim() || null,
      expiresAt: expiresAt || null,
      isActive,
    });
    return redirect(`/clients/${params.id}/licenses`);
  } catch (error) {
    if (isAxiosError(error)) {
      return submission.reply({
        formErrors: [error.response?.data?.message || 'Error al actualizar la licencia'],
      });
    }
    return submission.reply({
      formErrors: ['Error al actualizar la licencia. Intenta de nuevo.'],
    });
  }
}

export default function EditLicensePage() {
  const { client, license } = useLoaderData<typeof loader>();
  const lastResult = useActionData<typeof action>();
  const [form, fields] = useForm({
    lastResult,
    schema,
    id: 'edit-license-form',
    defaultValue: {
      key: license.key,
      product: license.product,
      machineId: license.machineId || '',
      expiresAt: formatDateForInput(license.expiresAt),
      isActive: license.isActive,
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to={`/clients/${client.id}/licenses`}
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
          Volver a Licencias de {client.name}
        </Link>
      </div>

      <Card className="border-0 shadow-xl">
        <CardContent className="p-8">
          <Form method="post" {...getFormProps(form)}>
            <FieldGroup>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Editar Licencia</h1>
                  <p className="text-muted-foreground text-sm">
                    Actualiza los datos de esta licencia
                  </p>
                </div>
              </div>

              {form.errors && <ErrorList errors={{ form: form.errors }} />}

              <Field>
                <FieldLabel htmlFor={fields.key.id}>Clave de Licencia *</FieldLabel>
                <Input
                  {...getInputProps(fields.key, { type: 'text' })}
                  key={fields.key.key}
                  defaultValue={fields.key.initialValue}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="font-mono h-11"
                />
                {fields.key.errors && <ErrorList errors={{ key: fields.key.errors }} />}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.product.id}>Producto *</FieldLabel>
                <Input
                  {...getInputProps(fields.product, { type: 'text' })}
                  key={fields.product.key}
                  defaultValue={fields.product.initialValue}
                  placeholder="Nombre del producto"
                  className="h-11"
                />
                {fields.product.errors && <ErrorList errors={{ product: fields.product.errors }} />}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.machineId.id}>ID de Máquina</FieldLabel>
                <Input
                  {...getInputProps(fields.machineId, { type: 'text' })}
                  key={fields.machineId.key}
                  defaultValue={fields.machineId.initialValue}
                  placeholder="Identificador único de la máquina"
                  className="font-mono h-11"
                />
                <FieldDescription>
                  Deja vacío para desvincular la licencia de la máquina actual.
                </FieldDescription>
                {fields.machineId.errors && (
                  <ErrorList errors={{ machineId: fields.machineId.errors }} />
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.expiresAt.id}>Fecha de Expiración</FieldLabel>
                <Input
                  {...getInputProps(fields.expiresAt, { type: 'datetime-local' })}
                  key={fields.expiresAt.key}
                  defaultValue={fields.expiresAt.initialValue}
                  className="h-11"
                />
                <FieldDescription>Deja vacío para una licencia permanente.</FieldDescription>
                {fields.expiresAt.errors && (
                  <ErrorList errors={{ expiresAt: fields.expiresAt.errors }} />
                )}
              </Field>

              <Field orientation="horizontal">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id={fields.isActive.id}
                    name={fields.isActive.name}
                    key={fields.isActive.key}
                    defaultChecked={license.isActive}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  <span className="ms-3 text-sm font-medium">Licencia activa</span>
                </label>
              </Field>

              <div className="bg-muted/50 rounded-xl p-5 border">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-muted-foreground"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  Información de la licencia
                </h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-background rounded-lg p-3 border">
                    <dt className="text-muted-foreground text-xs mb-1">Creada</dt>
                    <dd className="font-medium">
                      {new Date(license.createdAt).toLocaleString('es-ES', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </dd>
                  </div>
                  <div className="bg-background rounded-lg p-3 border">
                    <dt className="text-muted-foreground text-xs mb-1">Última actualización</dt>
                    <dd className="font-medium">
                      {new Date(license.updatedAt).toLocaleString('es-ES', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex gap-3 pt-6 border-t">
                <Button type="submit" className="flex-1 h-11 shadow-lg shadow-primary/25">
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
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Guardar Cambios
                </Button>
                <Button variant="outline" asChild className="h-11">
                  <Link to={`/clients/${client.id}/licenses`}>Cancelar</Link>
                </Button>
              </div>
            </FieldGroup>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
