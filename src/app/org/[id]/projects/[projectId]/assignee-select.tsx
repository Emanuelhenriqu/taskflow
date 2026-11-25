"use client";

import { useTransition } from "react";
import { assignTask } from "./actions";

// Seletor de responsável: salva sozinho ao escolher uma opção.
export function AssigneeSelect({
  taskId,
  assigneeId,
  members,
}: {
  taskId: string;
  assigneeId: string | null;
  members: { id: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Responsável"
      defaultValue={assigneeId ?? ""}
      disabled={pending}
      onChange={(event) => {
        const value = event.target.value;
        startTransition(async () => {
          await assignTask(taskId, value || null);
        });
      }}
      className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-50"
    >
      <option value="">Sem responsável</option>
      {members.map((member) => (
        <option key={member.id} value={member.id}>
          {member.label}
        </option>
      ))}
    </select>
  );
}
