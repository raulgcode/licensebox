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
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link 
          to={`/clients/${client.id}/licenses`} 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="m15 18-6-6 6-6"/>
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
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Nueva Licencia</h1>
                  <p className="text-muted-foreground text-sm">Para el cliente: <span className="font-medium text-foreground">{client.name}</span></p>
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
                <FieldDescription>
                  Se ha generado automáticamente. Puedes modificarla si lo deseas.
                </FieldDescription>
                {fields.key.errors && <ErrorList errors={{ key: fields.key.errors }} />}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.product.id}>Producto *</FieldLabel>
                <Input
                  {...getInputProps(fields.product, { type: 'text' })}
                  placeholder="Ej: Software Premium, Plan Enterprise..."
                  className="h-11"
                />
                {fields.product.errors && <ErrorList errors={{ product: fields.product.errors }} />}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.machineId.id}>ID de Máquina</FieldLabel>
                <Input
                  {...getInputProps(fields.machineId, { type: 'text' })}
                  placeholder="Identificador único del dispositivo"
                  className="font-mono h-11"
                />
                <FieldDescription>
                  Opcional. Deja vacío si aún no ha sido activada.
                </FieldDescription>
                {fields.machineId.errors && (
                  <ErrorList errors={{ machineId: fields.machineId.errors }} />
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.expiresAt.id}>Fecha de Expiración</FieldLabel>
                <Input 
                  {...getInputProps(fields.expiresAt, { type: 'datetime-local' })} 
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
                    defaultChecked
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  <span className="ms-3 text-sm font-medium">Licencia activa</span>
                </label>
              </Field>

              <div className="flex gap-3 pt-6 border-t">
                <Button type="submit" className="flex-1 h-11 shadow-lg shadow-primary/25">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Crear Licencia
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
