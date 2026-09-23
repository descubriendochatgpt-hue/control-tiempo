import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Clientes que el usuario puede elegir al crear una oportunidad. */
export async function getClientesParaSelector() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("id, nombre")
    .neq("estado", "inactivo")
    .order("nombre")
    .limit(1000);
  return data ?? [];
}
