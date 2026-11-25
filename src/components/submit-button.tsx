"use client";

import { useFormStatus } from "react-dom";

// Botão de envio que trava enquanto o formulário está sendo enviado,
// evitando cliques duplos (e, com ele desativado, Enter duplo também).
export function SubmitButton({
  children,
  pendingText,
}: {
  children: React.ReactNode;
  pendingText: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pendingText : children}
    </button>
  );
}
