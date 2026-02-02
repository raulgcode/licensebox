import type { ActionFunctionArgs } from 'react-router';
import { Form, useActionData, useNavigation, useRouteLoaderData } from 'react-router';
import { getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useForm } from '@/hooks/useForm';
import { ErrorList } from '@/components/errorList';
import { createAuthenticatedApi } from '@/lib/api';
import { isAxiosError } from 'axios';
import type { loader as layoutLoader } from './_layout';

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'La contraseña actual es obligatoria' })
      .min(1, { message: 'La contraseña actual es obligatoria' }),
    newPassword: z
      .string({ required_error: 'La nueva contraseña es obligatoria' })
      .min(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' }),
    confirmPassword: z
      .string({ required_error: 'Debes confirmar la nueva contraseña' })
      .min(1, { message: 'Debes confirmar la nueva contraseña' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export async function action({ request }: ActionFunctionArgs) {
  const api = await createAuthenticatedApi(request);
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: changePasswordSchema });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { currentPassword, newPassword } = submission.value;

  try {
    await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });

    return { status: submission.status };
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message || 'Error al cambiar la contraseña';
      return submission.reply({
        formErrors: [message],
      });
    }
    return submission.reply({
      formErrors: ['Error al cambiar la contraseña. Intenta de nuevo.'],
    });
  }
}

export default function ProfilePage() {
  const layoutData = useRouteLoaderData<typeof layoutLoader>('routes/_layout');
  const user = layoutData?.user;
  const lastResult = useActionData<typeof action>();
  const navigation = useNavigation();

  const [form, fields] = useForm({
    lastResult,
    schema: changePasswordSchema,
    id: 'change-password-form',
  });

  const isSubmitting = navigation.state === 'submitting';
  const isLoading = navigation.state === 'loading';
  const isSuccess = lastResult?.status === 'success';

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground mt-2">Administra tu información personal y seguridad</p>
      </div>

      {/* User Info Card */}
      <Card className="border-0 shadow-xl mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/10 text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl">{user?.name || 'Usuario'}</CardTitle>
              <CardDescription className="text-base">{user?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Change Password Card */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-500/20 to-amber-500/10 text-amber-600">
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
              <CardTitle>Cambiar Contraseña</CardTitle>
              <CardDescription>
                Actualiza tu contraseña para mantener tu cuenta segura
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isSuccess && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
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
                <span className="font-medium">Contraseña actualizada correctamente</span>
              </div>
            </div>
          )}

          <Form method="post" {...getFormProps(form)}>
            <FieldGroup>
              {form.errors && <ErrorList errors={{ form: form.errors }} />}

              <Field>
                <FieldLabel htmlFor={fields.currentPassword.id}>Contraseña actual</FieldLabel>
                <Input
                  {...getInputProps(fields.currentPassword, { type: 'password' })}
                  key={fields.currentPassword.key}
                  placeholder="********"
                  autoComplete="current-password"
                  className="h-11"
                />
                {fields.currentPassword.errors && (
                  <ErrorList errors={{ currentPassword: fields.currentPassword.errors }} />
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.newPassword.id}>Nueva contraseña</FieldLabel>
                <Input
                  {...getInputProps(fields.newPassword, { type: 'password' })}
                  key={fields.newPassword.key}
                  placeholder="********"
                  autoComplete="new-password"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground mt-1">Mínimo 8 caracteres</p>
                {fields.newPassword.errors && (
                  <ErrorList errors={{ newPassword: fields.newPassword.errors }} />
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.confirmPassword.id}>
                  Confirmar nueva contraseña
                </FieldLabel>
                <Input
                  {...getInputProps(fields.confirmPassword, { type: 'password' })}
                  key={fields.confirmPassword.key}
                  placeholder="********"
                  autoComplete="new-password"
                  className="h-11"
                />
                {fields.confirmPassword.errors && (
                  <ErrorList errors={{ confirmPassword: fields.confirmPassword.errors }} />
                )}
              </Field>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full sm:w-auto h-11 px-8 shadow-lg shadow-primary/25"
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
                  {isSubmitting && 'Actualizando...'}
                  {isLoading && 'Cargando...'}
                  {!isSubmitting && !isLoading && 'Actualizar Contraseña'}
                </Button>
              </div>
            </FieldGroup>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
