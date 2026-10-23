"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Field, Select } from "@/components/ui";

type Veiculo = { id: string; modelo: string; placa: string | null };
type Cliente = { id: string; nome: string; veiculos: Veiculo[] };

export function ClienteVeiculoPicker({
  clientes,
  clienteIdInicial,
  veiculoIdInicial,
  veiculoObrigatorio = false,
}: {
  clientes: Cliente[];
  clienteIdInicial?: string;
  veiculoIdInicial?: string;
  veiculoObrigatorio?: boolean;
}) {
  const [clienteId, setClienteId] = useState(clienteIdInicial ?? "");

  const veiculos = useMemo(
    () => clientes.find((c) => c.id === clienteId)?.veiculos ?? [],
    [clientes, clienteId]
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Cliente *">
        <Select name="clienteId" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
          <option value="">Selecione...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={veiculoObrigatorio ? "Veículo *" : "Veículo"}>
        <Select
          key={clienteId}
          name="veiculoId"
          defaultValue={veiculoIdInicial ?? ""}
          disabled={!clienteId}
        >
          <option value="">Selecione...</option>
          {veiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.modelo} {v.placa ? `- ${v.placa}` : ""}
            </option>
          ))}
        </Select>
        {veiculoObrigatorio && clienteId && veiculos.length === 0 && (
          <p className="mt-1 text-xs text-red-600">
            Este cliente ainda não tem veículo.{" "}
            <Link href={`/clientes/${clienteId}`} className="font-medium underline">
              Cadastre na página do cliente
            </Link>{" "}
            e volte aqui.
          </p>
        )}
      </Field>
    </div>
  );
}
