"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProject(orgId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .insert({ organization_id: orgId, name });

  if (error) {
    // O limite do plano Free é aplicado por um trigger no banco.
    if (error.message.includes("Limite do plano Free")) {
      redirect(`/org/${orgId}?error=limit`);
    }
    throw new Error(error.message);
  }

  revalidatePath(`/org/${orgId}`);
  redirect(`/org/${orgId}`);
}

export async function deleteProject(orgId: string, projectId: string) {
  const supabase = await createClient();

  // O RLS só permite apagar projeto a administradores. Para quem não é admin,
  // a consulta não dá erro, mas também não apaga nada: por isso conferimos as linhas.
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("organization_id", orgId)
    .select("id");

  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error("Você não tem permissão para apagar este projeto.");
  }

  revalidatePath(`/org/${orgId}`);
  redirect(`/org/${orgId}`);
}
