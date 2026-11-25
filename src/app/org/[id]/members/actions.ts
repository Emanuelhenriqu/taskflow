"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Traduz as mensagens de erro do banco em códigos curtos para a URL.
function errorCode(message: string): string | null {
  if (message.includes("Não existe usuário")) return "user-not-found";
  if (message.includes("já faz parte")) return "already-member";
  if (message.includes("pelo menos um administrador")) return "last-admin";
  if (message.includes("Apenas administradores")) return "forbidden";
  return null;
}

function membersPath(orgId: string) {
  return `/org/${orgId}/members`;
}

export async function addMember(orgId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const role = formData.get("role") === "admin" ? "admin" : "member";
  if (!email) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_member_by_email", {
    org: orgId,
    member_email: email,
    new_role: role,
  });

  if (error) {
    const code = errorCode(error.message);
    if (code) redirect(`${membersPath(orgId)}?error=${code}`);
    throw new Error(error.message);
  }

  revalidatePath(membersPath(orgId));
  redirect(membersPath(orgId));
}

export async function changeRole(orgId: string, userId: string, role: string) {
  // Ações do servidor podem ser chamadas por qualquer cliente: valide a entrada.
  if (role !== "admin" && role !== "member") throw new Error("Papel inválido.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .update({ role })
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .select("user_id");

  if (error) {
    const code = errorCode(error.message);
    if (code) redirect(`${membersPath(orgId)}?error=${code}`);
    throw new Error(error.message);
  }

  // Sem erro e sem linhas alteradas: o RLS barrou (usuário não é admin).
  if (!data?.length) redirect(`${membersPath(orgId)}?error=forbidden`);

  revalidatePath(membersPath(orgId));
  redirect(membersPath(orgId));
}

export async function removeMember(orgId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("memberships")
    .delete()
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .select("user_id");

  if (error) {
    const code = errorCode(error.message);
    if (code) redirect(`${membersPath(orgId)}?error=${code}`);
    throw new Error(error.message);
  }

  if (!data?.length) redirect(`${membersPath(orgId)}?error=forbidden`);

  // Quem remove a si mesmo perde o acesso à organização.
  if (user?.id === userId) redirect("/dashboard");

  revalidatePath(membersPath(orgId));
  redirect(membersPath(orgId));
}
