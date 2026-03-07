import {
  Form,
  useActionData,
  useNavigation,
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

const schema = z.object({
  email: z
    .string({ required_error: 'El correo es obligatorio' })
    .email({ message: 'El correo no es válido' }),
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  try {
    await api.post('/auth/forgot-password', { email: submission.payload.email });
  } catch {
    // Silently ignore errors — never reveal if an email exists
  }

  return submission.reply({ resetForm: true, fieldErrors: {} });
}

export default function ForgotPassword() {
  const lastResult = useActionData<typeof action>();
  const navigation = useNavigation();

  const [form, fields] = useForm({
    lastResult,
    schema,
    id: 'forgot-password-form',
  });

  const submitted = lastResult && 'status' in lastResult && lastResult.status === 'success';

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
              <h1 className="text-2xl font-bold tracking-tight">¿Olvidaste tu contraseña?</h1>
              <p className="text-muted-foreground text-balance text-sm">
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </p>
            </div>

            {submitted ? (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                <p className="text-sm text-green-800 font-medium">
                  Si el correo existe en nuestro sistema, recibirás un enlace en los próximos minutos.
                </p>
              </div>
            ) : (
              <Form method="post" {...getFormProps(form)}>
                <FieldGroup>
                  {form.errors && <ErrorList errors={{ form: form.errors }} />}
                  <Field>
                    <FieldLabel htmlFor={fields.email.id}>Correo electrónico</FieldLabel>
                    <Input
                      {...getInputProps(fields.email, { type: 'email' })}
                      placeholder="correo@ejemplo.com"
                      className="h-11"
                    />
                    {fields.email.errors && (
                      <ErrorList errors={{ email: fields.email.errors }} />
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
                      {navigation.state === 'submitting' ? 'Enviando...' : 'Enviar enlace'}
                    </Button>
                  </Field>
                </FieldGroup>
              </Form>
            )}

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
