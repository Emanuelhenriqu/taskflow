import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "admin" | "member";

export type Member = {
  userId: string;
  role: Role;
  name: string;
  email: string | null;
};

type ProfileRow = { id: string; full_name: string | null; email: string | null };

// Papel do usuário logado dentro de uma organização (null se não for membro).
export async function getCurrentRole(
  supabase: SupabaseClient,
  orgId: string
): Promise<{ userId: string | null; role: Role | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: null };

  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  return { userId: user.id, role: (data?.role ?? null) as Role | null };
}

// Membros da organização com nome e e-mail (o RLS só deixa ver quem é da mesma organização).
export async function getOrgMembers(
  supabase: SupabaseClient,
  orgId: string
): Promise<Member[]> {
  const { data: memberships } = await supabase
    .from("memberships")
    .select("user_id, role, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  const rows = memberships ?? [];
  if (rows.length === 0) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in(
      "id",
      rows.map((m) => m.user_id)
    );
  const profiles = (data ?? []) as ProfileRow[];

  return rows.map((m) => {
    const profile = profiles.find((p) => p.id === m.user_id);
    return {
      userId: m.user_id as string,
      role: m.role as Role,
      name: profile?.full_name || profile?.email || "Sem nome",
      email: profile?.email ?? null,
    };
  });
}
