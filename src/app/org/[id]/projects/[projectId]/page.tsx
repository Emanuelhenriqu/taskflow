import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, getOrgMembers } from "@/lib/org";
import { SubmitButton } from "@/components/submit-button";
import { createTask, deleteTask, moveTask } from "./actions";
import { AssigneeSelect } from "./assignee-select";

const columns = [
  { status: "todo", title: "A fazer" },
  { status: "doing", title: "Fazendo" },
  { status: "done", title: "Feito" },
] as const;

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id, projectId } = await params;
  const supabase = await createClient();

  // Confere que o projeto existe, é visível ao usuário (RLS) e pertence à organização da URL.
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, organization_id")
    .eq("id", projectId)
    .eq("organization_id", id)
    .single();

  if (!project) notFound();

  const [{ data: tasks, error: listError }, members, { role }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, assignee_id")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true }),
    getOrgMembers(supabase, project.organization_id),
    getCurrentRole(supabase, project.organization_id),
  ]);

  // Admin define o responsável e apaga tarefas; membro cria e move entre colunas.
  const isAdmin = role === "admin";
  const memberOptions = members.map((m) => ({ id: m.userId, label: m.name }));
  const memberNames = new Map(members.map((m) => [m.userId, m.name]));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href={`/org/${project.organization_id}`}
        className="text-sm text-slate-600 hover:underline"
      >
        ← Voltar para projetos
      </Link>

      <h1 className="mt-4 text-2xl font-bold">{project.name}</h1>

      <form action={createTask.bind(null, project.id)} className="mt-6 flex gap-3">
        <input
          name="title"
          placeholder="Nova tarefa"
          required
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <SubmitButton pendingText="Adicionando...">Adicionar</SubmitButton>
      </form>

      {listError && (
        <p className="mt-3 text-sm text-red-600">
          Não foi possível carregar as tarefas: {listError.message}
        </p>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {columns.map((column, columnIndex) => {
          const columnTasks = tasks?.filter((t) => t.status === column.status) ?? [];
          const previous = columns[columnIndex - 1];
          const next = columns[columnIndex + 1];

          return (
            <section key={column.status} className="rounded-xl bg-slate-100 p-3">
              <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold text-slate-700">
                {column.title}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
                  {columnTasks.length}
                </span>
              </h2>

              <ul className="space-y-2">
                {columnTasks.map((task) => (
                  <li key={task.id} className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="text-sm">{task.title}</p>

                    {isAdmin ? (
                      <AssigneeSelect
                        key={`${task.id}-${task.assignee_id ?? "none"}`}
                        taskId={task.id}
                        assigneeId={task.assignee_id}
                        members={memberOptions}
                      />
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">
                        Responsável:{" "}
                        {task.assignee_id
                          ? (memberNames.get(task.assignee_id) ?? "—")
                          : "ninguém"}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-1">
                      {previous && (
                        <form action={moveTask.bind(null, task.id, previous.status)}>
                          <button
                            aria-label={`Mover para ${previous.title}`}
                            title={`Mover para ${previous.title}`}
                            className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100"
                          >
                            ←
                          </button>
                        </form>
                      )}
                      {next && (
                        <form action={moveTask.bind(null, task.id, next.status)}>
                          <button
                            aria-label={`Mover para ${next.title}`}
                            title={`Mover para ${next.title}`}
                            className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100"
                          >
                            →
                          </button>
                        </form>
                      )}
                      {isAdmin && (
                        <form action={deleteTask.bind(null, task.id)} className="ml-auto">
                          <button
                            aria-label="Apagar tarefa"
                            title="Apagar tarefa"
                            className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}

                {columnTasks.length === 0 && (
                  <li className="px-1 py-2 text-xs text-slate-400">Nenhuma tarefa</li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
