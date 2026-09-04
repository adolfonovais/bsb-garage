"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

/**
 * Aba de filtro (ex: status da OS) que mostra um spinner enquanto a
 * navegação está pendente. Como todas as abas apontam pra mesma rota (só
 * muda o searchParams), o Next não troca de segmento — sem isso, clicar
 * numa aba não dava nenhum feedback visual até a lista terminar de
 * recarregar. `prefetch={false}` é necessário porque com prefetch a
 * navegação já chega pronta e o estado "pending" nunca aparece (ver docs
 * do useLinkStatus).
 */
function PendingSpinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className="ml-1.5 inline h-3 w-3 animate-spin align-[-1px]" />;
}

export function StatusTabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
      <PendingSpinner />
    </Link>
  );
}
