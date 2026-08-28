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
}: {
  tiposServico: { id: string; nome: string }[];
  itensIniciais?: ItemForm[];
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
    const qtd = Number(it.quantidade) || 0;
    const valor = Number(it.valorUnit) || 0;
    return soma + qtd * valor;
  }, 0);

  return (
    <div>
      <input type="hidden" name="itens_count" value={itens.length} />
      <div className="space-y-3">
        {itens.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 items-start gap-2 rounded-md border border-slate-200 p-3">
            <div className="col-span-12 sm:col-span-4">
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
            <div className="col-span-12 sm:col-span-4">
              <Input
                name={`item_desc_${idx}`}
                placeholder="Descrição (ex: Porta traseira direita)"
                value={item.descricao}
                onChange={(e) => atualizar(idx, "descricao", e.target.value)}
                required
              />
            </div>
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
