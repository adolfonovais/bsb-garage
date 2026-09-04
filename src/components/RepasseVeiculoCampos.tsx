"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { formatarMoeda, formatarVeiculo, numeroFormatado } from "@/lib/format";

type ItemOS = {
  id: string;
  descricao: string;
  valorTotal: number;
  tipoServicoNome: string | null;
};

type OS = {
  id: string;
  numero: number;
  ano: number;
  cliente: { nome: string };
  veiculo: { modelo: string; placa: string | null } | null;
  itens: ItemOS[];
};

export function RepasseVeiculoCampos({
  ordens,
  carroInicial,
  placaInicial,
  osIdInicial,
  tipoServicoInicial,
}: {
  ordens: OS[];
  carroInicial?: string;
  placaInicial?: string;
  osIdInicial?: string;
  tipoServicoInicial?: string;
}) {
  const [osId, setOsId] = useState(osIdInicial ?? "");
  const [carro, setCarro] = useState(carroInicial ?? "");
  const [placa, setPlaca] = useState(placaInicial ?? "");
  const [tipoServico, setTipoServico] = useState(tipoServicoInicial ?? "");
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());

  const osSelecionada = ordens.find((o) => o.id === osId);

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
      if (osSelecionada) {
        const marcados = osSelecionada.itens.filter((it) => novo.has(it.id));
        // Usa o mesmo "Tipo de serviço" já cadastrado nos itens da OS
        // (Martelinho/Pintura/Lanternagem...); se nenhum item marcado tiver
        // tipo definido, cai pra descrição do item como antes.
        const tipos = [...new Set(marcados.map((it) => it.tipoServicoNome).filter((t): t is string => !!t))];
        setTipoServico(tipos.length > 0 ? tipos.join("/") : marcados.map((it) => it.descricao).join(", "));
      }
      return novo;
    });
  }

  return (
    <>
      <Field
        label="Vincular a uma OS (opcional)"
        hint="Preenche carro/placa automaticamente ao selecionar. Só lista OS com serviços ainda não repassados."
      >
        <Select name="osId" value={osId} onChange={(e) => selecionarOS(e.target.value)}>
          <option value="">Nenhuma</option>
          {ordens.map((os) => (
            <option key={os.id} value={os.id}>
              {numeroFormatado(os.numero, os.ano)} — {os.cliente.nome}
              {os.veiculo ? ` (${formatarVeiculo(os.veiculo)})` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <div className="space-y-4 sm:col-span-2">
        {osSelecionada && osSelecionada.itens.length > 0 && (
          <Field
            label="Serviços da OS repassados"
            hint="Marque quais itens dessa OS (ainda não repassados) estão indo pra esse prestador — preenche o Tipo de serviço abaixo."
          >
            <div className="space-y-1.5 rounded-md border border-slate-300 bg-white p-3">
              {osSelecionada.itens.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={itensSelecionados.has(item.id)}
                    onChange={() => alternarItem(item)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {itensSelecionados.has(item.id) && <input type="hidden" name="itemIds" value={item.id} />}
                  {item.descricao}
                  <span className="text-xs text-slate-400">({formatarMoeda(item.valorTotal)})</span>
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

        <Field label="Tipo de serviço *">
          <Input
            name="tipoServico"
            required
            value={tipoServico}
            onChange={(e) => setTipoServico(e.target.value)}
            placeholder="Ex: Lanternagem/Pintura"
          />
        </Field>
      </div>
    </>
  );
}
