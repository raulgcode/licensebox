import { useForm as useFormConform, type FormMetadata } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import type { z } from 'zod';

/**
 * Extract the options type from useForm, excluding the props we'll handle internally
 */
type ConformFormOptions<Schema extends Record<string, any>> = Parameters<
  typeof useFormConform<Schema, Schema, string[]>
>[0];

/**
 * Options for the useForm wrapper hook
 */
export type UseFormOptions<Schema extends z.ZodType<any, z.ZodTypeDef, any>> = Omit<
  ConformFormOptions<z.output<Schema>>,
  'constraint' | 'onValidate'
> & {
  /**
   * The Zod schema used for validation
   */
  schema: Schema;
  /**
   * Custom onValidate handler. If not provided, uses parseWithZod with the schema.
   */
  onValidate?: ConformFormOptions<z.output<Schema>>['onValidate'];
};

/**
 * Return type of the useForm hook
 */
export type UseFormReturn<Schema extends z.ZodType<any, z.ZodTypeDef, any>> = [
  FormMetadata<z.output<Schema>, string[]>,
  ReturnType<FormMetadata<z.output<Schema>, string[]>['getFieldset']>,
];

/**
 * A wrapper around conform's useForm that reduces boilerplate by:
 * - Automatically setting up Zod constraint validation
 * - Providing sensible defaults for validation timing
 * - Maintaining full type safety with Zod schemas
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 *
 * const [form, fields] = useForm({
 *   schema,
 *   lastResult: actionData,
 * });
 * ```
 */
export function useForm<Schema extends z.ZodType<any, z.ZodTypeDef, any>>(
  options: UseFormOptions<Schema>,
): UseFormReturn<Schema> {
  const { schema, onValidate, ...restOptions } = options;

  return useFormConform({
    constraint: getZodConstraint(schema),
    onValidate: onValidate ?? (({ formData }) => parseWithZod(formData, { schema })),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    ...restOptions,
  }) as UseFormReturn<Schema>;
}
