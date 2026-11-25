import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/org";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmButton } from "@/components/confirm-button";
import { createProject, deleteProject } from "./actions";

const FREE_PROJECT_LIMIT = 2;

export default async function OrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: actionError } = await searchParams;
  const supabase = await createClient();

  // O RLS só devolve a organização se o usuário for membro dela.
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, plan")
    .eq("id", id)
    .single();

  if (!org) notFound();

  const [{ role }, { data: projects, error: listError }] = await Promise.all([
    getCurrentRole(supabase, org.id),
    supabase
      .from("projects")
      .select("id, name, created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
  ]);

  const isAdmin = role === "admin";
  const isFree = org.plan === "free";
  const projectCount = projects?.length ?? 0;
  const limitReached = isFree && projectCount >= FREE_PROJECT_LIMIT;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-slate-600 hover:underline">
        ← Voltar para organizações
      </Link>

      <header className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/org/${org.id}/members`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            Membros
          </Link>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
              org.plan === "pro"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {org.plan}
          </span>
        </div>
      </header>

      {isFree && (
        <p className="mt-2 text-sm text-slate-600">
          {projectCount} de {FREE_PROJECT_LIMIT} projetos usados no plano Free.
        </p>
      )}

      <h2 className="mt-8 text-lg font-semibold">Projetos</h2>

      {limitReached ? (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Você atingiu o limite de {FREE_PROJECT_LIMIT} projetos do plano Free.
          Faça upgrade para o Pro para criar mais projetos.
        </div>
      ) : (
        <form action={createProject.bind(null, org.id)} className="mt-3 flex gap-3">
          <input
            name="name"
            placeholder="Nome do novo projeto"
            required
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <SubmitButton pendingText="Criando...">Criar projeto</SubmitButton>
        </form>
      )}

      {actionError === "limit" && !limitReached && (
        <p className="mt-3 text-sm text-red-600">
          Limite do plano Free atingido. Faça upgrade para o Pro.
        </p>
      )}

      {listError && (
        <p className="mt-3 text-sm text-red-600">
          Não foi possível carregar os projetos: {listError.message}
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {projects?.length ? (
          projects.map((project) => (
            <li key={project.id} className="flex items-center gap-3">
              <Link
                href={`/org/${org.id}/projects/${project.id}`}
                className="flex-1 rounded-xl border border-slate-200 bg-white p-4 font-medium hover:border-indigo-400"
              >
                {project.name}
              </Link>
              {isAdmin && (
                <form action={deleteProject.bind(null, org.id, project.id)}>
                  <ConfirmButton
                    message={`Apagar o projeto "${project.name}" e todas as tarefas dele? Essa ação não pode ser desfeita.`}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Apagar
                  </ConfirmButton>
                </form>
              )}
            </li>
          ))
        ) : (
          <li className="text-slate-500">Nenhum projeto ainda. Crie o primeiro acima.</li>
        )}
      </ul>
    </main>
  );
}
