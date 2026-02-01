export function ErrorList({ errors }: { errors: Record<string, string[] | null> | undefined }) {
  if (!errors) {
    return null;
  }
  return (
    <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-destructive ">
      {Object.entries(errors).map(([field, messages]) =>
        messages?.map((message) => <li key={`${field}-error-${message}`}>{message}</li>),
      )}
    </ul>
  );
}
