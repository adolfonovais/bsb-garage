"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/ordens-servico", label: "Ordens de Serviço", icon: Wrench },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/oficinas", label: "Oficinas terceirizadas", icon: Factory },
  { href: "/repasses", label: "Repasses", icon: ArrowLeftRight },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-800 bg-black text-neutral-100 md:flex">
      <div className="flex items-center gap-3 border-b border-neutral-800 px-5 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- o otimizador de imagem (sharp) não roda nesta arquitetura (Windows ARM64) em dev */}
        <img
          src="/brand/logo.png"
          alt="Logo BSB Garage Martelinho de Ouro"
          width={44}
          height={44}
          className="shrink-0"
        />
        <div>
          <p className="text-sm font-bold leading-tight">BSB Garage</p>
          <p className="text-xs text-neutral-400 leading-tight">Martelinho de Ouro</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
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
  );
}
