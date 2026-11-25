import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, getOrgMembers } from "@/lib/org";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmButton } from "@/components/confirm-button";
import { addMember, changeRole, removeMember } from "./actions";

const errorMessages: Record<string, string> = {
  "user-not-found":
    "Não existe usuário cadastrado com esse e-mail. A pessoa precisa criar uma conta primeiro.",
  "already-member": "Essa pessoa já faz parte da organização.",
  "last-admin": "A organização precisa ter pelo menos um administrador.",
  forbidden: "Apenas administradores podem fazer isso.",
};

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!org) notFound();

  const [{ userId, role }, members] = await Promise.all([
    getCurrentRole(supabase, org.id),
    getOrgMembers(supabase, org.id),
  ]);

  const isAdmin = role === "admin";
  const message = error ? errorMessages[error] : undefined;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href={`/org/${org.id}`} className="text-sm text-slate-600 hover:underline">
        ← Voltar para {org.name}
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Membros</h1>
      <p className="mt-1 text-sm text-slate-600">
        {isAdmin
          ? "Você é administrador: pode adicionar, remover e mudar o papel dos membros."
          : "Somente administradores podem gerenciar os membros."}
      </p>

      {isAdmin && (
        <form action={addMember.bind(null, org.id)} className="mt-6 flex flex-wrap gap-3">
          <input
            name="email"
            type="email"
            placeholder="E-mail de quem já tem conta"
            required
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <select
            name="role"
            defaultValue="member"
            aria-label="Papel"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            <option value="member">Membro</option>
            <option value="admin">Admin</option>
          </select>
          <SubmitButton pendingText="Adicionando...">Adicionar</SubmitButton>
        </form>
      )}

      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}

      <ul className="mt-6 space-y-3">
        {members.map((member) => (
          <li
            key={member.userId}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {member.name}
                {member.userId === userId && (
                  <span className="ml-2 text-xs font-normal text-slate-500">(você)</span>
                )}
              </p>
              {member.email && (
                <p className="truncate text-sm text-slate-500">{member.email}</p>
              )}
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                member.role === "admin"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {member.role === "admin" ? "Admin" : "Membro"}
            </span>

            {isAdmin && (
              <>
                <form
                  action={changeRole.bind(
                    null,
                    org.id,
                    member.userId,
                    member.role === "admin" ? "member" : "admin"
                  )}
                >
                  <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
                    {member.role === "admin" ? "Tornar membro" : "Tornar admin"}
                  </button>
                </form>
                <form action={removeMember.bind(null, org.id, member.userId)}>
                  <ConfirmButton
                    message={`Remover ${member.name} da organização?`}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remover
                  </ConfirmButton>
                </form>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
