import { Form, redirect, useActionData, type ActionFunctionArgs } from 'react-router';
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
} & React.ComponentProps<'div'>;

export function LoginForm({ className, fields, form, ...props }: LoginFormProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form method="post" className="p-6 md:p-8" {...getFormProps(form)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Bienvenido de nuevo</h1>
                <p className="text-muted-foreground text-balance">Inicia sesión en tu cuenta</p>
              </div>
              <Field>
                <FieldLabel htmlFor={fields.email.id}>Correo electrónico</FieldLabel>
                <Input
                  {...getInputProps(fields.email, {
                    type: 'email',
                    placeholder: 'correo@ejemplo.com',
                  })}
                  autoComplete="email"
                />
                {fields.email.errors && <ErrorList errors={{ email: fields.email.errors }} />}
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor={fields.password.id}>Contraseña</FieldLabel>
                  <a href="#" className="ml-auto text-sm underline-offset-2 hover:underline">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <Input
                  {...getInputProps(fields.password, { type: 'password', placeholder: '********' })}
                  autoComplete="current-password"
                />
                {fields.password.errors && (
                  <ErrorList errors={{ password: fields.password.errors }} />
                )}
              </Field>
              <Field>
                <Button type="submit">Iniciar sesión</Button>
              </Field>
            </FieldGroup>
          </Form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop"
              alt="Fondo de gradiente abstracto"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
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

    const { access_token, user } = response.data;

    // Store the token in localStorage for the axios interceptor
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access_token);
    }

    // Redirect to home page after successful login
    return redirect('/');
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

  const [form, fields] = useForm({
    lastResult,
    schema,
    id: 'login-form',
  });

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm form={form} fields={fields} />
      </div>
    </div>
  );
}
