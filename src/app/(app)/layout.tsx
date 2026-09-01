import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MobileMenuProvider } from "@/components/MobileMenu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const nome = session?.user?.name ?? "Usuário";
  const papel = session?.user?.papel ?? "FUNCIONARIO";

  return (
    <MobileMenuProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar isAdmin={papel === "ADMIN"} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar nome={nome} papel={papel} />
          <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </MobileMenuProvider>
  );
}
