import { auth } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { AlterarSenhaForm } from "@/components/AlterarSenhaForm";

export default async function MinhaContaPage() {
  const session = await auth();

  return (
    <div className="max-w-md space-y-6">
      <PageHeader title="Minha conta" subtitle={session?.user?.email ?? ""} />

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Alterar senha</h2>
        <AlterarSenhaForm />
      </Card>
    </div>
  );
}
