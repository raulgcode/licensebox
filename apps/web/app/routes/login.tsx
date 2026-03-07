import {
  Form,
  redirect,
  useActionData,
  useNavigation,
  type ActionFunctionArgs,
} from 'react-router';
import { getFormProps, getInputProps } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useForm, type UseFormReturn } from '@/hooks/useForm';
import { ErrorList } from '@/components/errorList';
import { api } from '@/lib/api';
import { authCookie } from '../cookies.server';
import type { LoginResponseDto } from '@licensebox/shared';

const schema = z.object({
  email: z
    .string({ required_error: 'El correo es obligatorio' })
    .email({ message: 'El correo no es válido' }),
  password: z.string({ required_error: 'La contraseña es obligatoria' }).min(1),
});

type LoginFormProps = {
  form: UseFormReturn<typeof schema>[0];
  fields: UseFormReturn<typeof schema>[1];
  navigation: ReturnType<typeof useNavigation>;
} & React.ComponentProps<'div'>;

export function LoginForm({ className, fields, form, navigation, ...props }: LoginFormProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden border-0 shadow-2xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form method="post" className="p-8 md:p-12" {...getFormProps(form)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-3 text-center mb-4">
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
                <h1 className="text-2xl font-bold tracking-tight">Bienvenido de nuevo</h1>
                <p className="text-muted-foreground text-balance text-sm">
                  Inicia sesión para administrar tus licencias
                </p>
              </div>
              {form.errors && <ErrorList errors={{ form: form.errors }} />}
              <Field>
                <FieldLabel htmlFor={fields.email.id}>Correo electrónico</FieldLabel>
                <Input
                  {...getInputProps(fields.email, { type: 'email' })}
                  placeholder="correo@ejemplo.com"
                  className="h-11"
                />
                {fields.email.errors && <ErrorList errors={{ email: fields.email.errors }} />}
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor={fields.password.id}>Contraseña</FieldLabel>
                  <a
                    href="/forgot-password"
                    className="ml-auto text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <Input
                  {...getInputProps(fields.password, { type: 'password' })}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11"
                />
                {fields.password.errors && (
                  <ErrorList errors={{ password: fields.password.errors }} />
                )}
              </Field>
              <Field>
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  disabled={navigation.state === 'submitting' || navigation.state === 'loading'}
                >
                  {navigation.state === 'submitting' && 'Autenticando...'}
                  {navigation.state === 'idle' && 'Iniciar sesión'}
                  {navigation.state === 'loading' && 'Cargando...'}
                </Button>
              </Field>
            </FieldGroup>
          </Form>
          <div className="relative hidden md:block bg-linear-to-br from-primary/90 via-primary to-primary/80">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
            <div className="relative z-10 flex h-full flex-col items-center justify-center p-12 text-primary-foreground">
              <div className="mb-8">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-24 w-24 opacity-90"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" x2="3" y1="12" y2="12" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-3">LicenseBox</h2>
              <p className="text-center text-lg opacity-90 max-w-xs">
                Gestiona tus licencias de software de forma simple y segura
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        ¿Necesitas ayuda? Contacta a tu administrador
      </p>
    </div>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { email, password } = submission.payload;

  try {
    const response = await api.post<LoginResponseDto>('/auth/login', {
      email,
      password,
    });

    const { access_token } = response.data;

    // Redirect to home page after successful login
    return redirect('/', {
      headers: {
        'Set-Cookie': await authCookie.serialize(access_token),
      },
    });
  } catch (error) {
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        return submission.reply({
          formErrors: ['Credenciales inválidas'],
        });
      }
    }

    return submission.reply({
      formErrors: ['Error al iniciar sesión. Intenta de nuevo.'],
    });
  }
}

export default function Login() {
  const lastResult = useActionData<typeof action>();
  let navigation = useNavigation();

  const [form, fields] = useForm({
    lastResult,
    schema,
    id: 'login-form',
  });

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm form={form} fields={fields} navigation={navigation} />
      </div>
    </div>
  );
}
