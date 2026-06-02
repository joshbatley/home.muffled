import { supabase } from "@home/auth";

function functionsUrl(): string {
  const base = ((import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL ?? "").replace(
    /\/$/,
    "",
  );
  return `${base}/functions/v1`;
}

export async function adminCreateUser(input: {
  email: string;
  password: string;
  role_ids: string[];
}): Promise<{ id: string; email: string }> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Not signed in");

  const res = await fetch(`${functionsUrl()}/admin-create-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: (import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY ?? "",
    },
    body: JSON.stringify(input),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof payload.error === "string" ? payload.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return payload as { id: string; email: string };
}
