"use client";

import { createContext, useContext, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui";

const CancelarContext = createContext<() => void>(() => {});

/** Botão "Cancelar edição" — usado dentro do `formulario` passado a <EdicaoInline>. */
export function BotaoCancelarEdicao() {
  const cancelar = useContext(CancelarContext);
  return (
    <Button type="button" variant="ghost" onClick={cancelar}>
      Cancelar edição
    </Button>
  );
}

/**
 * Alterna entre uma visualização somente-leitura (com botão "Editar") e um
 * formulário de edição (que deve incluir <BotaoCancelarEdicao /> e um botão
 * de submit). Usado nas telas de Cliente/Oficina/Peça/Repasse, que editam
 * os dados direto na própria tela de detalhe, sem uma rota /editar separada.
 */
export function EdicaoInline({
  visualizacao,
  formulario,
}: {
  visualizacao: React.ReactNode;
  formulario: React.ReactNode;
}) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <div>
        {visualizacao}
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={() => setEditando(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        </div>
      </div>
    );
  }

  return <CancelarContext.Provider value={() => setEditando(false)}>{formulario}</CancelarContext.Provider>;
}
