import type { ActionFunctionArgs } from 'react-router';
import { Form, redirect, useActionData, Link } from 'react-router';
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
    await api.post('/clients', {
      name: name.trim(),
      description: description?.trim() || null,
      isActive,
    });
    return redirect('/clients');
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
  const [form, fields] = useForm({
    lastResult,
    schema,
    id: 'new-client-form',
    defaultValue: {
      isActive: true,
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/clients" className="text-blue-600 hover:text-blue-800">
          ← Volver a Clientes
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form method="post" {...getFormProps(form)}>
            <FieldGroup>
              <div className="mb-4">
                <h1 className="text-2xl font-bold">Crear Nuevo Cliente</h1>
              </div>

              {form.errors && <ErrorList errors={{ form: form.errors }} />}

              <Field>
                <FieldLabel htmlFor={fields.name.id}>Nombre *</FieldLabel>
                <Input
                  {...getInputProps(fields.name, { type: 'text' })}
                  placeholder="Ingresa el nombre del cliente"
                />
                {fields.name.errors && <ErrorList errors={{ name: fields.name.errors }} />}
              </Field>

              <Field>
                <FieldLabel htmlFor={fields.description.id}>Descripción</FieldLabel>
                <textarea
                  id={fields.description.id}
                  name={fields.description.name}
                  defaultValue={fields.description.initialValue}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  placeholder="Ingresa la descripción del cliente (opcional)"
                />
                {fields.description.errors && (
                  <ErrorList errors={{ description: fields.description.errors }} />
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
                <FieldLabel htmlFor={fields.isActive.id}>Activo</FieldLabel>
              </Field>

              <div className="flex gap-4 pt-4">
                <Button type="submit">Crear Cliente</Button>
                <Link
                  to="/clients"
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
