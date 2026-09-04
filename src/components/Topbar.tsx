"use client";

import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { useMobileMenu } from "@/components/MobileMenu";
import { sairAction } from "@/components/topbar-actions";
import { BotaoOcultarValores } from "@/components/ValoresPrivacidade";

export function Topbar({ nome, papel }: { nome: string; papel: string }) {
  const { setAberto } = useMobileMenu();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6 print:hidden">
      <div className="flex items-center gap-3 md:hidden">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="text-slate-600 hover:text-slate-900"
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <p className="text-sm font-bold text-slate-900">BSB Garage Martelinho de Ouro</p>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <BotaoOcultarValores />
        <Link href="/minha-conta" className="text-right hover:opacity-70" title="Minha conta">
          <p className="text-sm font-medium text-slate-900">{nome}</p>
          <p className="text-xs text-slate-500">{papel === "ADMIN" ? "Administrador" : "Funcionário"}</p>
        </Link>
        <form action={sairAction}>
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
