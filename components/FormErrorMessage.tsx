interface FormErrorMessageProps {
  id: string;
  message: string;
}

export default function FormErrorMessage({
  id,
  message,
}: FormErrorMessageProps) {
  if (!message) return null;

  return (
    <div
      id={id}
      role="alert"
      aria-atomic="true"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
    >
      {message}
    </div>
  );
}
