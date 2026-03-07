import type { ActionFunctionArgs } from 'react-router';
import { Form, useActionData, useNavigation, Link, data } from 'react-router';
import { useState, useEffect } from 'react';
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
import type { RegenerateSecretResponseDto } from '@licensebox/shared';
import { ClientSecretModal } from '@/components/client-secret-modal';
import { isAxiosError } from 'axios';

const schema = z.object({
  name: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(1, { message: 'El nombre es obligatorio' }),
  description: z.string().optional(),
  isActive: z.preprocess((val) => val === 'on' || val === true, z.boolean().default(true)),
});

export async function action({ request }: ActionFunctionArgs) {
  const api = await createAuthenticatedApi(request);
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { name, description, isActive } = submission.value;

  try {
    const { data: response } = await api.post<RegenerateSecretResponseDto>('/clients', {
      name: name.trim(),
      description: description?.trim() || null,
      isActive,
    });
    return data({ success: true, secretData: response });
  } catch (error) {
    if (isAxiosError(error)) {
      return submission.reply({
        formErrors: [error.response?.data?.message || 'Error al crear el cliente'],
      });
    }
    return submission.reply({
      formErrors: ['Error al crear el cliente. Intenta de nuevo.'],
    });
  }
}

export default function NewClientPage() {
  const lastResult = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const isLoading = navigation.state === 'loading';
  const [showSecretModal, setShowSecretModal] = useState(false);

  const submissionResult =
    lastResult && 'success' in lastResult ? null : lastResult;

  const [form, fields] = useForm({
    lastResult: submissionResult,
    schema,
    id: 'new-client-form',
    defaultValue: {
      isActive: true,
    },
  });

  // Get the secret data from action if successful
  const secretData =
    lastResult && 'success' in lastResult && lastResult.success ? lastResult.secretData : null;

  // Show modal when client is created successfully
  useEffect(() => {
    if (secretData && !showSecretModal) {
      setShowSecretModal(true);
    }
  }, [secretData, showSecretModal]);

  const handleCloseModal = () => {
    setShowSecretModal(false);
    // Redirect to clients page after modal is closed
    window.location.href = '/clients';
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
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
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" x2="19" y1="8" y2="14" />
                    <line x1="22" x2="16" y1="11" y2="11" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Nuevo Cliente</h1>
                  <p className="text-muted-foreground text-sm">
                    Ingresa los datos del nuevo cliente
                  </p>
                </div>
              </div>

              {form.errors && <ErrorList errors={{ form: form.errors }} />}

              <Field>
                <FieldLabel htmlFor={fields.name.id}>Nombre del cliente *</FieldLabel>
                <Input
                  {...getInputProps(fields.name, { type: 'text' })}
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
                    defaultChecked
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
                  {isSubmitting && 'Creando...'}
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
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Crear Cliente
                    </>
                  )}
                </Button>
                <Button variant="outline" asChild className="h-11">
                  <Link to="/clients">Cancelar</Link>
                </Button>
              </div>
            </FieldGroup>
          </Form>
        </CardContent>
      </Card>

      {/* Secret Modal */}
      {secretData && (
        <ClientSecretModal
          isOpen={showSecretModal}
          onClose={handleCloseModal}
          secret={secretData.secret}
          clientName={secretData.name}
          message={secretData.message}
        />
      )}
    </div>
  );
}
