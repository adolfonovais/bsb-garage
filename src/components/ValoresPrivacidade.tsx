"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { formatarMoeda } from "@/lib/format";

const CHAVE_STORAGE = "bsb-garage:valores-ocultos";
const listeners = new Set<() => void>();

function lerStorage(): boolean {
  try {
    return localStorage.getItem(CHAVE_STORAGE) === "1";
  } catch {
    // localStorage indisponível (ex: navegação privada) — mantém visível.
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

const OcultarValoresContext = createContext<{ oculto: boolean; alternar: () => void }>({
  oculto: false,
  alternar: () => {},
});

/**
 * Guarda em localStorage (por navegador, não por usuário) se os valores em
 * R$ devem aparecer mascarados — pra poder deixar a tela aberta na frente
 * de alguém sem expor valores de cliente/oficina. Sem servidor envolvido,
 * é só uma preferência de exibição. Usa useSyncExternalStore (não
 * useEffect+setState) pra ler o localStorage sem gerar re-render em
 * cascata e sem divergir do HTML já renderizado no servidor (que nunca vê
 * `false` real, sempre o valor padrão).
 */
export function ValoresPrivacidadeProvider({ children }: { children: ReactNode }) {
  const oculto = useSyncExternalStore(subscribe, lerStorage, getServerSnapshot);

  function alternar() {
    try {
      localStorage.setItem(CHAVE_STORAGE, oculto ? "0" : "1");
    } catch {
      // se não conseguir persistir, a preferência só não sobrevive ao reload.
    }
    for (const callback of listeners) callback();
  }

  return <OcultarValoresContext.Provider value={{ oculto, alternar }}>{children}</OcultarValoresContext.Provider>;
}

export function useValoresOcultos() {
  return useContext(OcultarValoresContext);
}

/** Botão de alternar (ícone de olho) — colocado na barra superior. */
export function BotaoOcultarValores() {
  const { oculto, alternar } = useValoresOcultos();
  return (
    <button
      type="button"
      onClick={alternar}
      className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      title={oculto ? "Mostrar valores" : "Ocultar valores"}
    >
      {oculto ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      <span className="hidden sm:inline">{oculto ? "Valores ocultos" : "Ocultar valores"}</span>
    </button>
  );
}

/**
 * Substituto de formatarMoeda(valor) direto no JSX — mostra "R$ ••••••"
 * enquanto a privacidade estiver ativada. `valor` já deve vir convertido
 * (número/string), nunca um Decimal do Prisma direto (não atravessa a
 * fronteira server->client component).
 */
export function Valor({
  valor,
  className,
}: {
  valor: number | string | null | undefined;
  className?: string;
}) {
  const { oculto } = useValoresOcultos();
  if (oculto) {
    return (
      <span className={className} aria-label="Valor oculto">
        R$ ••••••
      </span>
    );
  }
  return <span className={className}>{formatarMoeda(valor)}</span>;
}
