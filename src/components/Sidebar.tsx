"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wrench,
  Settings,
  Factory,
  ArrowLeftRight,
  Wallet,
  Boxes,
  BarChart3,
  X,
} from "lucide-react";
import { useMobileMenu } from "@/components/MobileMenu";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/ordens-servico", label: "Ordens de Serviço", icon: Wrench },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/oficinas", label: "Oficinas terceirizadas", icon: Factory },
  { href: "/repasses", label: "Repasses", icon: ArrowLeftRight },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const { aberto, setAberto } = useMobileMenu();

  // Fecha o menu mobile sozinho quando o usuário navega pra outra página.
  useEffect(() => {
    setAberto(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden print:hidden"
          onClick={() => setAberto(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-neutral-800 bg-black text-neutral-100 transition-transform duration-200 md:static md:translate-x-0 md:flex print:hidden ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-neutral-800 px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- o otimizador de imagem (sharp) não roda nesta arquitetura (Windows ARM64) em dev */}
          <img
            src="/brand/logo.png"
            alt="Logo BSB Garage Martelinho de Ouro"
            width={44}
            height={44}
            className="shrink-0"
          />
          <div className="flex-1">
            <p className="text-sm font-bold leading-tight">BSB Garage</p>
            <p className="text-xs text-neutral-400 leading-tight">Martelinho de Ouro</p>
          </div>
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="text-neutral-400 hover:text-white md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-amber-500 text-black"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/configuracoes"
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/configuracoes")
                ? "bg-amber-500 text-black"
                : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
        )}
      </nav>
        <div className="border-t border-neutral-800 px-4 py-3 text-xs text-neutral-500">
          NFS-e e WhatsApp chegam em breve — ver Configurações.
        </div>
      </aside>
    </>
  );
}
