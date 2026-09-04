"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input, Select } from "@/components/ui";

export type ItemForm = {
  descricao: string;
  quantidade: string;
  valorUnit: string;
  tipoServicoId: string;
};

export function ItensEditor({
  tiposServico,
  itensIniciais,
  pecas,
  mostrarQuantidade = true,
}: {
  tiposServico: { id: string; nome: string }[];
  itensIniciais?: ItemForm[];
  /** Lista de peças pra um dropdown de atalho na descrição (ver src/lib/pecas-carro.ts). Sem isso, some o dropdown e sobra só o campo de texto livre. */
  pecas?: string[];
  /** false esconde a coluna de quantidade (fica sempre 1 nos itens criados). */
  mostrarQuantidade?: boolean;
}) {
  const [itens, setItens] = useState<ItemForm[]>(
    itensIniciais && itensIniciais.length > 0
      ? itensIniciais
      : [{ descricao: "", quantidade: "1", valorUnit: "", tipoServicoId: "" }]
  );

  function atualizar(idx: number, campo: keyof ItemForm, valor: string) {
    setItens((atual) => atual.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }

  function adicionar() {
    setItens((atual) => [...atual, { descricao: "", quantidade: "1", valorUnit: "", tipoServicoId: "" }]);
  }

  function remover(idx: number) {
    setItens((atual) => (atual.length > 1 ? atual.filter((_, i) => i !== idx) : atual));
  }

  const total = itens.reduce((soma, it) => {
    const qtd = mostrarQuantidade ? Number(it.quantidade) || 0 : 1;
    const valor = Number(it.valorUnit) || 0;
    return soma + qtd * valor;
  }, 0);

  // Tailwind precisa das classes literais (não dá pra montar "col-span-N" via
  // template string — o scanner não encontraria a classe no build).
  const tipoColSpanClass = mostrarQuantidade ? "sm:col-span-4" : "sm:col-span-3";
  const descColSpanClass = pecas
    ? mostrarQuantidade
      ? "sm:col-span-1"
      : "sm:col-span-3"
    : mostrarQuantidade
      ? "sm:col-span-4"
      : "sm:col-span-5";

  return (
    <div>
      <input type="hidden" name="itens_count" value={itens.length} />
      <div className="space-y-3">
        {itens.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 items-start gap-2 rounded-md border border-slate-200 p-3">
            <div className={`col-span-12 ${tipoColSpanClass}`}>
              <Select
                name={`item_tipo_${idx}`}
                value={item.tipoServicoId}
                onChange={(e) => atualizar(idx, "tipoServicoId", e.target.value)}
              >
                <option value="">Tipo de serviço (opcional)</option>
                {tiposServico.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Select>
            </div>
            {pecas && (
              <div className="col-span-12 sm:col-span-3">
                <Select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) atualizar(idx, "descricao", e.target.value);
                  }}
                >
                  <option value="">Selecionar peça...</option>
                  {pecas.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className={`col-span-12 ${descColSpanClass}`}>
              <Input
                name={`item_desc_${idx}`}
                placeholder={pecas ? "Ou digite se a peça não estiver na lista" : "Descrição (ex: Porta traseira direita)"}
                value={item.descricao}
                onChange={(e) => atualizar(idx, "descricao", e.target.value)}
                required
              />
            </div>
            {mostrarQuantidade && (
              <div className="col-span-4 sm:col-span-1">
                <Input
                  name={`item_qtd_${idx}`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Qtd."
                  value={item.quantidade}
                  onChange={(e) => atualizar(idx, "quantidade", e.target.value)}
                />
              </div>
            )}
            <div className="col-span-6 sm:col-span-2">
              <Input
                name={`item_valor_${idx}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor (R$)"
                value={item.valorUnit}
                onChange={(e) => atualizar(idx, "valorUnit", e.target.value)}
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1 flex justify-end pt-2">
              <button
                type="button"
                onClick={() => remover(idx)}
                className="text-slate-400 hover:text-red-600"
                title="Remover item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={adicionar}
        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800"
      >
        <Plus className="h-4 w-4" /> Adicionar item
      </button>

      <div className="mt-4 flex justify-end border-t border-slate-200 pt-3">
        <p className="text-sm font-semibold text-slate-900">
          Total: {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>
    </div>
  );
}
