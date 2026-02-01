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
import type { ClientDto } from '@licensebox/shared';
import { isAxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

function generateLicenseKey(): string {
  return uuidv4();
}

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

export async function loader({ params, request }: LoaderFunctionArgs) {
  const api = await createAuthenticatedApi(request);
  const { data: client } = await api.get<ClientDto>(`/clients/${params.id}`);
  const suggestedKey = generateLicenseKey();
  return data({ client, suggestedKey });
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
    await api.post('/licenses', {
      key: key.trim(),
      product: product.trim(),
      clientId: params.id,
      machineId: machineId?.trim() || null,
      expiresAt: expiresAt || null,
      isActive,
    });
    return redirect(`/clients/${params.id}/licenses`);
  } catch (error) {
    if (isAxiosError(error)) {
      return submission.reply({
        formErrors: [error.response?.data?.message || 'Error al crear la licencia'],
      });
    }
    return submission.reply({
      formErrors: ['Error al crear la licencia. Intenta de nuevo.'],
    });
  }
}

export default function NewLicensePage() {
  const { client, suggestedKey } = useLoaderData<typeof loader>();
  const lastResult = useActionData<typeof action>();
  const [form, fields] = useForm({
    lastResult,
    schema,
    id: 'new-license-form',
    defaultValue: {
      key: suggestedKey,
      isActive: true,
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to={`/clients/${client.id}/licenses`} className="text-blue-600 hover:text-blue-800">
          ← Volver a Licencias de {client.name}
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form method="post" {...getFormProps(form)}>
            <FieldGroup>
              <div className="mb-4">
                <h1 className="text-2xl font-bold">Nueva Licencia para {client.name}</h1>
              </div>

              {form.errors && <ErrorList errors={{ form: form.errors }} />}

              <Field>
                <FieldLabel htmlFor={fields.key.id}>Clave de Licencia *</FieldLabel>
                <Input
                  {...getInputProps(fields.key, { type: 'text' })}
                  key={fields.key.key}
                  defaultValue={fields.key.initialValue}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="font-mono"
                />
                <FieldDescription>
                  Se ha generado una clave automáticamente. Puedes modificarla si lo deseas.
                </FieldDescription>
                {fields.key.errors && <ErrorList errors={{ key: fields.key.errors }} />}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.product.id}>Producto *</FieldLabel>
                <Input
                  {...getInputProps(fields.product, { type: 'text' })}
                  placeholder="Nombre del producto"
                />
                {fields.product.errors && <ErrorList errors={{ product: fields.product.errors }} />}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.machineId.id}>ID de Máquina</FieldLabel>
                <Input
                  {...getInputProps(fields.machineId, { type: 'text' })}
                  placeholder="Identificador único de la máquina (opcional)"
                  className="font-mono"
                />
                <FieldDescription>
                  Deja vacío si la licencia aún no ha sido activada en una máquina.
                </FieldDescription>
                {fields.machineId.errors && (
                  <ErrorList errors={{ machineId: fields.machineId.errors }} />
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.expiresAt.id}>Fecha de Expiración</FieldLabel>
                <Input {...getInputProps(fields.expiresAt, { type: 'datetime-local' })} />
                <FieldDescription>Deja vacío para una licencia sin expiración.</FieldDescription>
                {fields.expiresAt.errors && (
                  <ErrorList errors={{ expiresAt: fields.expiresAt.errors }} />
                )}
              </Field>

              <Field orientation="horizontal">
                <input
                  type="checkbox"
                  id={fields.isActive.id}
                  name={fields.isActive.name}
                  defaultChecked
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <FieldLabel htmlFor={fields.isActive.id}>Licencia activa</FieldLabel>
              </Field>

              <div className="flex gap-4 pt-4">
                <Button type="submit">Crear Licencia</Button>
                <Link
                  to={`/clients/${client.id}/licenses`}
                  className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  Cancelar
                </Link>
              </div>
            </FieldGroup>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
