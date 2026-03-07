import {
  Form,
  redirect,
  useActionData,
  useNavigation,
  useSearchParams,
  type ActionFunctionArgs,
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
import { api } from '@/lib/api';

const schema = z
  .object({
    token: z.string({ required_error: 'Token inválido' }).min(1),
    newPassword: z
      .string({ required_error: 'La contraseña es obligatoria' })
      .min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
    confirmPassword: z.string({ required_error: 'Debes confirmar la contraseña' }).min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { token, newPassword } = submission.payload;

  try {
    await api.post('/auth/reset-password', { token, newPassword });
    return redirect('/login?passwordReset=true');
  } catch (error) {
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message =
        axiosError.response?.data?.message ||
        'El enlace de recuperación no es válido o ha expirado.';
      return submission.reply({ formErrors: [message] });
    }
    return submission.reply({ formErrors: ['Error al restablecer la contraseña.'] });
  }
}

export default function ResetPassword() {
  const lastResult = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [form, fields] = useForm({
    lastResult,
    schema,
    id: 'reset-password-form',
    defaultValue: { token },
  });

  if (!token) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-muted-foreground">Enlace de recuperación inválido.</p>
          <a href="/forgot-password" className="mt-4 inline-block text-sm text-primary hover:text-primary/80">
            Solicitar nuevo enlace
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden border-0 shadow-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-3 text-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Nueva contraseña</h1>
              <p className="text-muted-foreground text-balance text-sm">
                Ingresa tu nueva contraseña.
              </p>
            </div>

            <Form method="post" {...getFormProps(form)}>
              <input {...getInputProps(fields.token, { type: 'hidden' })} />
              <FieldGroup>
                {form.errors && <ErrorList errors={{ form: form.errors }} />}
                <Field>
                  <FieldLabel htmlFor={fields.newPassword.id}>Nueva contraseña</FieldLabel>
                  <Input
                    {...getInputProps(fields.newPassword, { type: 'password' })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="h-11"
                  />
                  {fields.newPassword.errors && (
                    <ErrorList errors={{ newPassword: fields.newPassword.errors }} />
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor={fields.confirmPassword.id}>Confirmar contraseña</FieldLabel>
                  <Input
                    {...getInputProps(fields.confirmPassword, { type: 'password' })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="h-11"
                  />
                  {fields.confirmPassword.errors && (
                    <ErrorList errors={{ confirmPassword: fields.confirmPassword.errors }} />
                  )}
                </Field>
                <Field>
                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                    disabled={
                      navigation.state === 'submitting' || navigation.state === 'loading'
                    }
                  >
                    {navigation.state === 'submitting' ? 'Guardando...' : 'Guardar contraseña'}
                  </Button>
                </Field>
              </FieldGroup>
            </Form>

            <div className="mt-4 text-center">
              <a
                href="/login"
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Volver al inicio de sesión
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
