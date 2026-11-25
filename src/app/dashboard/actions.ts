"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  // A função SQL cria a organização e já torna o usuário admin dela.
  const { error } = await supabase.rpc("create_organization", { org_name: name });

  if (error) {
    // 23505 = violação de unicidade: já existe uma organização com esse nome.
    if (error.code === "23505") redirect("/dashboard?error=name-taken");
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
