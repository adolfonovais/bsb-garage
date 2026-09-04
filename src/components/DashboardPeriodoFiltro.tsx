"use client";

import { useRef } from "react";
import { Field, Input } from "@/components/ui";

/**
 * "De"/"Até" que aplicam o filtro sozinhos ao trocar a data — sem botão de
 * "Filtrar" — pra deixar a tela mais limpa. O status (pills, fora daqui)
 * viaja junto como campo escondido pra não se perder ao mudar o período.
 */
export function DashboardPeriodoFiltro({
  inicioStr,
  fimStr,
  status,
}: {
  inicioStr: string;
  fimStr: string;
  status: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action="/dashboard" method="get" className="flex flex-wrap items-end gap-3">
      {status && <input type="hidden" name="status" value={status} />}
      <Field label="De">
        <Input
          name="inicio"
          type="date"
          defaultValue={inicioStr}
          required
          onChange={() => formRef.current?.requestSubmit()}
        />
      </Field>
      <Field label="Até">
        <Input
          name="fim"
          type="date"
          defaultValue={fimStr}
          required
          onChange={() => formRef.current?.requestSubmit()}
        />
      </Field>
    </form>
  );
}
