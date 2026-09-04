"use client";

import { useActionState, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { STATUS_CONTA_LABEL } from "@/lib/format";
import { Valor } from "@/components/ValoresPrivacidade";

export type EstadoFormulario = { sucesso?: boolean } | undefined;
type AcaoAtualizar = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

export type ContaParaItem = {
  id: string;
  tipo: "PAGAR" | "RECEBER";
  descricao: string;
  categoria: string | null;
  valor: number;
  dataVencimentoInput: string;
  dataVencimentoFormatada: string;
  recorrente: boolean;
  status: string;
};

/**
 * Uma linha de "Conta a pagar/receber" com um botão de lápis que abre uma
 * edição inline (descrição/categoria/vencimento/valor/recorrente) — antes
 * só dava pra marcar como paga ou excluir, não tinha como corrigir um erro
 * de digitação sem apagar e recadastrar. Recebe valores já convertidos pra
 * tipos simples (não Decimal/Date do Prisma) — só assim atravessam a
 * fronteira server->client component.
 */
export function ContaItem({
  conta,
  acaoAtualizar,
  acaoMarcarPaga,
  acaoReabrir,
  acaoExcluir,
}: {
  conta: ContaParaItem;
  acaoAtualizar: AcaoAtualizar;
  acaoMarcarPaga: (contaId: string) => Promise<void>;
  acaoReabrir: (contaId: string) => Promise<void>;
  acaoExcluir: (contaId: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [estado, formAction] = useActionState(acaoAtualizar, undefined);

  // Fecha assim que a action retornar sucesso — comparado durante o render
  // (não num useEffect) pra não gerar um ciclo extra de render.
  const [estadoTratado, setEstadoTratado] = useState(estado);
  if (estado !== estadoTratado) {
    setEstadoTratado(estado);
    if (estado?.sucesso) setEditando(false);
  }

  if (editando) {
    return (
      <li className="px-4 py-3">
        <form action={formAction} className="grid grid-cols-2 gap-3">
          <input type="hidden" name="tipo" value={conta.tipo} />
          <div className="col-span-2">
            <Field label="Descrição *">
              <Input name="descricao" defaultValue={conta.descricao} required />
            </Field>
          </div>
          <Field label="Categoria">
            <Input name="categoria" defaultValue={conta.categoria ?? ""} placeholder="Opcional" />
          </Field>
          <Field label="Vencimento *">
            <Input name="dataVencimento" type="date" required defaultValue={conta.dataVencimentoInput} />
          </Field>
          <div className="col-span-2">
            <Field label="Valor *">
              <Input name="valor" type="number" step="0.01" min="0" required defaultValue={conta.valor} />
            </Field>
          </div>
          {conta.tipo === "PAGAR" && (
            <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="recorrente"
                defaultChecked={conta.recorrente}
                className="h-4 w-4 rounded border-slate-300"
              />
              Conta recorrente (repete todo mês — gera a próxima ao marcar como paga)
            </label>
          )}
          <div className="col-span-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
            <SubmitButton>Salvar</SubmitButton>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 px-4 py-2">
      <div>
        <p className="font-medium text-slate-900">
          {conta.descricao}
          {conta.recorrente && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500">
              Recorrente
            </span>
          )}
        </p>
        <p className="text-xs text-slate-500">
          {conta.categoria ? `${conta.categoria} · ` : ""}Vencimento: {conta.dataVencimentoFormatada}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium"><Valor valor={conta.valor} /></span>
        <Badge status={conta.status} label={STATUS_CONTA_LABEL[conta.status]} />
        {conta.status !== "PAGA" ? (
          <form action={acaoMarcarPaga.bind(null, conta.id)}>
            <button type="submit" className="text-xs font-medium text-amber-700 hover:underline">
              Marcar paga
            </button>
          </form>
        ) : (
          <form action={acaoReabrir.bind(null, conta.id)}>
            <button type="submit" className="text-xs font-medium text-slate-500 hover:underline">
              Reabrir
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="text-slate-400 hover:text-amber-700"
          title="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <form action={acaoExcluir.bind(null, conta.id)}>
          <button type="submit" className="text-slate-400 hover:text-red-600" title="Excluir">
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    </li>
  );
}
