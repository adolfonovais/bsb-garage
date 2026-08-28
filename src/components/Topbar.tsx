import { signOut } from "@/lib/auth";
import { LogOut } from "lucide-react";

export function Topbar({ nome, papel }: { nome: string; papel: string }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="md:hidden">
        <p className="text-sm font-bold text-slate-900">BSB Garage Martelinho de Ouro</p>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{nome}</p>
          <p className="text-xs text-slate-500">{papel === "ADMIN" ? "Administrador" : "Funcionário"}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
