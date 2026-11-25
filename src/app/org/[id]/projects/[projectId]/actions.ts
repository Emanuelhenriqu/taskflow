"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const STATUSES = ["todo", "doing", "done"];
const BOARD_PATH = "/org/[id]/projects/[projectId]";

export async function createTask(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();

  // A organização vem do próprio projeto (o RLS só o devolve a quem é membro),
  // e não do que chegou da tela. Assim ninguém cria tarefa em projeto alheio.
  const { data: project } = await supabase
    .from("projects")
    .select("organization_id")
    .eq("id", projectId)
    .single();

  if (!project) throw new Error("Projeto não encontrado.");

  const { error } = await supabase.from("tasks").insert({
    organization_id: project.organization_id,
    project_id: projectId,
    title,
  });
  if (error) throw new Error(error.message);

  revalidatePath(BOARD_PATH, "page");
}

export async function moveTask(taskId: string, status: string) {
  if (!STATUSES.includes(status)) throw new Error("Status inválido.");

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) throw new Error(error.message);

  revalidatePath(BOARD_PATH, "page");
}

// Define (ou remove, com null) o responsável pela tarefa.
// Que o responsável seja membro da organização é garantido por um trigger no banco.
export async function assignTask(taskId: string, assigneeId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ assignee_id: assigneeId || null })
    .eq("id", taskId);
  if (error) throw new Error(error.message);

  revalidatePath(BOARD_PATH, "page");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();

  // O RLS só permite apagar tarefa a administradores. Para quem não é admin a
  // consulta não dá erro, mas também não apaga nada: por isso conferimos as linhas.
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .select("id");

  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error("Você não tem permissão para apagar esta tarefa.");
  }

  revalidatePath(BOARD_PATH, "page");
}
