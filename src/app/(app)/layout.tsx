import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MobileMenuProvider } from "@/components/MobileMenu";
import { ValoresPrivacidadeProvider } from "@/components/ValoresPrivacidade";
import { organizacaoAtual, ehAdminDaPlataforma } from "@/lib/tenant";
import { diasRestantesDoTeste, SLUG_ORGANIZACAO_COM_LOGO } from "@/lib/marca";
import { sairAction } from "@/components/topbar-actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const nome = session?.user?.name ?? "Usuário";
  const papel = session?.user?.papel ?? "FUNCIONARIO";
  const organizacao = await organizacaoAtual();

  // Conta suspensa pelo dono da plataforma: sessões já abertas também caem aqui.
  if (!organizacao.ativa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-lg font-bold text-slate-900">Conta suspensa</h1>
          <p className="mt-2 text-sm text-slate-600">
            O acesso da {organizacao.nome} está temporariamente suspenso. Entre em contato com o suporte.
          </p>
          <form action={sairAction} className="mt-4">
            <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Sair
            </button>
          </form>
        </div>
      </div>
    );
  }

  const diasDeTeste = diasRestantesDoTeste(organizacao);

  return (
    <ValoresPrivacidadeProvider>
      <MobileMenuProvider>
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar
            isAdmin={papel === "ADMIN"}
            nomeOrganizacao={organizacao.nome}
            comLogo={organizacao.slug === SLUG_ORGANIZACAO_COM_LOGO}
            adminPlataforma={ehAdminDaPlataforma(session?.user?.email)}
          />
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <Topbar nome={nome} papel={papel} nomeOrganizacao={organizacao.nome} />
            {diasDeTeste !== null && (
              <div className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 print:hidden">
                {diasDeTeste > 0
                  ? `Teste grátis — ${diasDeTeste} ${diasDeTeste === 1 ? "dia restante" : "dias restantes"}.`
                  : "Seu período de teste terminou — fale com o suporte pra continuar."}
              </div>
            )}
            <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
          </div>
        </div>
      </MobileMenuProvider>
    </ValoresPrivacidadeProvider>
  );
}
