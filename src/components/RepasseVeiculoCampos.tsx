"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { formatarVeiculo, numeroFormatado } from "@/lib/format";

type OS = {
  id: string;
  numero: number;
  ano: number;
  cliente: { nome: string };
  veiculo: { modelo: string; placa: string | null } | null;
};

export function RepasseVeiculoCampos({
  ordens,
  carroInicial,
  placaInicial,
  osIdInicial,
}: {
  ordens: OS[];
  carroInicial?: string;
  placaInicial?: string;
  osIdInicial?: string;
}) {
  const [carro, setCarro] = useState(carroInicial ?? "");
  const [placa, setPlaca] = useState(placaInicial ?? "");

  function selecionarOS(osId: string) {
    const os = ordens.find((o) => o.id === osId);
    if (os?.veiculo) {
      setCarro(os.veiculo.modelo);
      setPlaca(os.veiculo.placa ?? "");
    }
  }

  return (
    <>
      <Field
        label="Vincular a uma OS (opcional)"
        hint="Preenche carro/placa automaticamente ao selecionar."
      >
        <Select name="osId" defaultValue={osIdInicial ?? ""} onChange={(e) => selecionarOS(e.target.value)}>
          <option value="">Nenhuma</option>
          {ordens.map((os) => (
            <option key={os.id} value={os.id}>
              {numeroFormatado(os.numero, os.ano)} — {os.cliente.nome}
              {os.veiculo ? ` (${formatarVeiculo(os.veiculo)})` : ""}
            </option>
          ))}
        </Select>
      </Field>

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
    </>
  );
}
