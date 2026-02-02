import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  Link,
  data,
} from 'react-router';
import { getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useForm } from '@/hooks/useForm';
import { ErrorList } from '@/components/errorList';
import { createAuthenticatedApi } from '@/lib/api';
import type { ClientDto } from '@licensebox/shared';
import { isAxiosError } from 'axios';

const schema = z.object({
  name: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(1, { message: 'El nombre es obligatorio' }),
  description: z.string().optional(),
  isActive: z.preprocess((val) => val === 'on' || val === true, z.boolean().default(true)),
});

export async function loader({ params, request }: LoaderFunctionArgs) {
  const api = await createAuthenticatedApi(request);
  const { data: client } = await api.get<ClientDto>(`/clients/${params.id}`);
  return data({ client });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const api = await createAuthenticatedApi(request);
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { name, description, isActive } = submission.value;

  try {
    await api.put(`/clients/${params.id}`, {
      name: name.trim(),
      description: description?.trim() || null,
      isActive,
    });
    return redirect(`/clients/${params.id}`);
  } catch (error) {
    if (isAxiosError(error)) {
      return submission.reply({
        formErrors: [error.response?.data?.message || 'Error al actualizar el cliente'],
      });
    }
    return submission.reply({
      formErrors: ['Error al actualizar el cliente. Intenta de nuevo.'],
    });
  }
}

export default function EditClientPage() {
  const { client } = useLoaderData<typeof loader>();
  const lastResult = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const isLoading = navigation.state === 'loading';

  const [form, fields] = useForm({
    lastResult,
    schema,
    id: 'edit-client-form',
    defaultValue: {
      name: client.name,
      description: client.description || '',
      isActive: client.isActive,
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
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
                  <h1 className="text-2xl font-bold tracking-tight">Editar Cliente</h1>
                  <p className="text-muted-foreground text-sm">Actualiza los datos del cliente</p>
                </div>
              </div>

              {form.errors && <ErrorList errors={{ form: form.errors }} />}

              <Field>
                <FieldLabel htmlFor={fields.name.id}>Nombre del cliente *</FieldLabel>
                <Input
                  {...getInputProps(fields.name, { type: 'text' })}
                  key={fields.name.key}
                  defaultValue={fields.name.initialValue}
                  placeholder="Ej: Acme Corporation"
                  className="h-11"
                />
                {fields.name.errors && <ErrorList errors={{ name: fields.name.errors }} />}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.description.id}>Descripción</FieldLabel>
                <textarea
                  id={fields.description.id}
                  name={fields.description.name}
                  key={fields.description.key}
                  defaultValue={fields.description.initialValue}
                  rows={4}
                  className="flex w-full rounded-lg border border-input bg-transparent px-4 py-3 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none"
                  placeholder="Breve descripción del cliente (opcional)"
                />
                {fields.description.errors && (
                  <ErrorList errors={{ description: fields.description.errors }} />
                )}
              </Field>

              <Field orientation="horizontal">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id={fields.isActive.id}
                    name={fields.isActive.name}
                    key={fields.isActive.key}
                    defaultChecked={client.isActive}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  <span className="ms-3 text-sm font-medium">Cliente activo</span>
                </label>
              </Field>

              <div className="flex gap-3 pt-6 border-t">
                <Button
                  type="submit"
                  className="flex-1 h-11 shadow-lg shadow-primary/25"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting && (
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
                  )}
                  {isSubmitting && 'Guardando...'}
                  {isLoading && 'Cargando...'}
                  {!isSubmitting && !isLoading && (
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
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      Guardar Cambios
                    </>
                  )}
                </Button>
                <Button variant="outline" asChild className="h-11">
                  <Link to={`/clients/${client.id}`}>Cancelar</Link>
                </Button>
              </div>
            </FieldGroup>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
