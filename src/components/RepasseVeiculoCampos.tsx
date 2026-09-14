"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { formatarVeiculo, numeroFormatado, STATUS_REPASSE_LABEL } from "@/lib/format";
import { Valor } from "@/components/ValoresPrivacidade";

type RepasseExistente = {
  oficinaId: string;
  oficinaNome: string;
  status: string;
};

type ItemOS = {
  id: string;
  descricao: string;
  valorTotal: number;
  tipoServicoNome: string | null;
  /** Repasses (não cancelados) que já cobrem esse item. */
  repassesExistentes: RepasseExistente[];
};

type OS = {
  id: string;
  numero: number;
  ano: number;
  cliente: { nome: string };
  veiculo: { modelo: string; placa: string | null } | null;
  itens: ItemOS[];
  /** Qualquer repasse (não cancelado) já existente pra essa OS, um por prestador. */
  repassesOS: RepasseExistente[];
};

export function RepasseVeiculoCampos({
  ordens,
  oficinas,
  oficinaIdInicial,
  carroInicial,
  placaInicial,
  osIdInicial,
  tipoServicoInicial,
  valorCobradoInicial,
  itensSelecionadosIniciais,
}: {
  ordens: OS[];
  oficinas: { id: string; nome: string }[];
  oficinaIdInicial?: string;
  carroInicial?: string;
  placaInicial?: string;
  osIdInicial?: string;
  tipoServicoInicial?: string;
  valorCobradoInicial?: string;
  itensSelecionadosIniciais?: string[];
}) {
  const [oficinaId, setOficinaId] = useState(oficinaIdInicial ?? "");
  const [osId, setOsId] = useState(osIdInicial ?? "");
  const [carro, setCarro] = useState(carroInicial ?? "");
  const [placa, setPlaca] = useState(placaInicial ?? "");
  const [tipoServico, setTipoServico] = useState(tipoServicoInicial ?? "");
  const [valorCobrado, setValorCobrado] = useState(valorCobradoInicial ?? "");
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(
    new Set(itensSelecionadosIniciais ?? [])
  );

  // Uma OS só deve ter UM repasse por prestador — se já existe um (completo
  // ou não) pra esse prestador, a OS some do dropdown pra ele; pra adicionar
  // mais itens é só editar o repasse existente, não criar outro. Pra outro
  // prestador diferente, a OS continua disponível normalmente (ex:
  // lanternagem numa oficina, pintura noutra). Sem prestador ainda, mostra tudo.
  function itemDisponivel(item: ItemOS, paraOficinaId: string) {
    return !paraOficinaId || !item.repassesExistentes.some((r) => r.oficinaId === paraOficinaId);
  }
  function osTemItemDisponivel(os: OS, paraOficinaId: string) {
    return !paraOficinaId || !os.repassesOS.some((r) => r.oficinaId === paraOficinaId);
  }

  const ordensDisponiveis = ordens.filter((os) => osTemItemDisponivel(os, oficinaId));
  const osSelecionada = ordensDisponiveis.find((o) => o.id === osId);
  const itensDisponiveis = osSelecionada ? osSelecionada.itens.filter((item) => itemDisponivel(item, oficinaId)) : [];

  // Pra explicar pro usuário por que uma OS sumiu do dropdown — sem isso,
  // uma OS já repassada (ainda que "Entregue") simplesmente desaparecia
  // sem nenhuma pista do motivo.
  const jaRepassadoParaOficina = oficinaId
    ? ordens
        .map((os) => {
          const repassesDessaOficina = os.repassesOS.filter((r) => r.oficinaId === oficinaId);
          if (repassesDessaOficina.length === 0) return null;
          const itensCobertos = os.itens.filter((item) =>
            item.repassesExistentes.some((r) => r.oficinaId === oficinaId)
          );
          const statuses = [...new Set(repassesDessaOficina.map((r) => r.status))];
          return { os, itensCobertos, statuses };
        })
        .filter((x): x is { os: OS; itensCobertos: ItemOS[]; statuses: string[] } => x !== null)
    : [];

  function selecionarOficina(novoOficinaId: string) {
    setOficinaId(novoOficinaId);
    setItensSelecionados(new Set());
    // Se a OS já escolhida não sobra com nenhum item disponível pra esse
    // prestador, desvincula pra não deixar o select numa OS que sumiu.
    const osAtual = ordens.find((o) => o.id === osId);
    if (osAtual && !osTemItemDisponivel(osAtual, novoOficinaId)) {
      setOsId("");
      setCarro("");
      setPlaca("");
    }
  }

  function selecionarOS(novoOsId: string) {
    setOsId(novoOsId);
    setItensSelecionados(new Set());
    const os = ordens.find((o) => o.id === novoOsId);
    if (os?.veiculo) {
      setCarro(os.veiculo.modelo);
      setPlaca(os.veiculo.placa ?? "");
    }
  }

  function alternarItem(item: ItemOS) {
    setItensSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(item.id)) {
        novo.delete(item.id);
      } else {
        novo.add(item.id);
      }
      const marcados = itensDisponiveis.filter((it) => novo.has(it.id));
      // Usa o mesmo "Tipo de serviço" já cadastrado nos itens da OS
      // (Martelinho/Pintura/Lanternagem...); se nenhum item marcado tiver
      // tipo definido, cai pra descrição do item como antes.
      const tipos = [...new Set(marcados.map((it) => it.tipoServicoNome).filter((t): t is string => !!t))];
      setTipoServico(tipos.length > 0 ? tipos.join("/") : marcados.map((it) => it.descricao).join(", "));
      // Valor cobrado do cliente = soma do valor desses itens na OS.
      const soma = marcados.reduce((total, it) => total + it.valorTotal, 0);
      setValorCobrado(marcados.length > 0 ? soma.toFixed(2) : "");
      return novo;
    });
  }

  return (
    <>
      <Field label="Prestador *">
        <Select name="oficinaId" value={oficinaId} onChange={(e) => selecionarOficina(e.target.value)} required>
          <option value="">Selecione...</option>
          {oficinas.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Vincular a uma OS (opcional)"
        hint="Preenche carro/placa automaticamente ao selecionar. Só lista OS que ainda não têm repasse pra esse prestador."
      >
        <Select name="osId" value={osId} onChange={(e) => selecionarOS(e.target.value)}>
          <option value="">Nenhuma</option>
          {ordensDisponiveis.map((os) => {
            const tipos = [...new Set(os.itens.map((it) => it.tipoServicoNome).filter((t): t is string => !!t))];
            return (
              <option key={os.id} value={os.id}>
                {numeroFormatado(os.numero, os.ano)}
                {tipos.length > 0 ? ` (${tipos.join("/")})` : ""} — {os.cliente.nome}
                {os.veiculo ? ` (${formatarVeiculo(os.veiculo)})` : ""}
              </option>
            );
          })}
        </Select>
      </Field>

      <div className="space-y-4 sm:col-span-2">
        {jaRepassadoParaOficina.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="font-medium">
              Já tem repasse pra esse prestador (por isso não aparecem acima) — edite o repasse existente pra
              adicionar mais itens:
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {jaRepassadoParaOficina.map(({ os, itensCobertos, statuses }) => (
                <li key={os.id}>
                  {numeroFormatado(os.numero, os.ano)} — {os.cliente.nome}:{" "}
                  {itensCobertos.length > 0 ? itensCobertos.map((item) => item.descricao).join(", ") : "OS inteira"} (
                  {statuses.map((s) => STATUS_REPASSE_LABEL[s] ?? s).join(", ")})
                </li>
              ))}
            </ul>
          </div>
        )}

        {osSelecionada && itensDisponiveis.length > 0 && (
          <Field
            label="Serviços da OS repassados"
            hint="Marque quais itens dessa OS (ainda não repassados pra esse prestador) estão indo pra ele — preenche o Tipo de serviço abaixo."
          >
            <div className="space-y-1.5 rounded-md border border-slate-300 bg-white p-3">
              {itensDisponiveis.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={itensSelecionados.has(item.id)}
                    onChange={() => alternarItem(item)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {itensSelecionados.has(item.id) && <input type="hidden" name="itemIds" value={item.id} />}
                  {item.tipoServicoNome && (
                    <span className="text-slate-500">{item.tipoServicoNome} —</span>
                  )}
                  {item.descricao}
                  <span className="text-xs text-slate-400">(<Valor valor={item.valorTotal} />)</span>
                </label>
              ))}
            </div>
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Carro *">
            <Input
              name="carro"
              required
              value={carro}
              onChange={(e) => setCarro(e.target.value)}
              placeholder="Ex: Discovery Sport"
            />
          </Field>
          <Field label="Placa">
            <Input
              name="placa"
              className="uppercase"
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipo de serviço *">
            <Input
              name="tipoServico"
              required
              value={tipoServico}
              onChange={(e) => setTipoServico(e.target.value)}
              placeholder="Ex: Lanternagem/Pintura"
            />
          </Field>
          <Field label="Valor cobrado do cliente *" hint="Preenchido com a soma dos itens marcados acima — pode editar.">
            <Input
              name="valorCobrado"
              type="number"
              step="0.01"
              min="0"
              required
              value={valorCobrado}
              onChange={(e) => setValorCobrado(e.target.value)}
            />
          </Field>
        </div>
      </div>
    </>
  );
}
