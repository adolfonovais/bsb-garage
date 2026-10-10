"use client";

import { useEffect } from "react";
import { marcarConversaComoLida } from "@/app/(app)/whatsapp/actions";

/** Ao abrir a conversa, marca as mensagens recebidas como lidas (some o contador do menu). */
export function MarcarConversaLida({ canonico, temNaoLidas }: { canonico: string; temNaoLidas: boolean }) {
  useEffect(() => {
    if (temNaoLidas) void marcarConversaComoLida(canonico);
  }, [canonico, temNaoLidas]);

  return null;
}
