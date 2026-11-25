import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { createOrganization, signOut } from "./actions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: actionError } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O RLS já filtra: só voltam as organizações das quais o usuário é membro.
  const { data: organizations, error: listError } = await supabase
    .from("organizations")
    .select("id, name, plan, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suas organizações</h1>
          <p className="text-sm text-slate-600">{user?.email}</p>
        </div>
        <form action={signOut}>
          <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
            Sair
          </button>
        </form>
      </header>

      <form action={createOrganization} className="mt-8 flex gap-3">
        <input
          name="name"
          placeholder="Nome da nova organização"
          required
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <SubmitButton pendingText="Criando...">Criar</SubmitButton>
      </form>

      {actionError === "name-taken" && (
        <p className="mt-3 text-sm text-red-600">
          Já existe uma organização com esse nome. Escolha outro nome.
        </p>
      )}

      {listError && (
        <p className="mt-3 text-sm text-red-600">
          Não foi possível carregar as organizações: {listError.message}
        </p>
      )}

      <ul className="mt-8 space-y-3">
        {organizations?.length ? (
          organizations.map((org) => (
            <li
              key={org.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <Link
                href={`/org/${org.id}`}
                className="font-medium text-indigo-700 hover:underline"
              >
                {org.name}
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
            </li>
          ))
        ) : (
          <li className="text-slate-500">
            Você ainda não tem nenhuma organização. Crie a primeira acima.
          </li>
        )}
      </ul>
    </main>
  );
}
