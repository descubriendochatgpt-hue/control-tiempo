import { FormularioLogin } from "./formulario";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const aviso =
    error === "inactivo"
      ? "Tu usuario está dado de baja. Habla con un administrador."
      : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Vertian Solutions</h1>
        <p className="mb-6 text-sm text-slate-500">CRM interno · Inicia sesión</p>
        <FormularioLogin avisoInicial={aviso} />
      </div>
    </main>
  );
}
