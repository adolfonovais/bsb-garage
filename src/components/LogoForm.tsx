"use client";

import { useActionState } from "react";
import { atualizarLogo, removerLogo, type EstadoLogo } from "@/app/(app)/configuracoes/actions";
import { SubmitButton } from "@/components/SubmitButton";

export function LogoForm({ logoUrl, personalizada }: { logoUrl: string | null; personalizada: boolean }) {
  const [state, action] = useActionState<EstadoLogo, FormData>(atualizarLogo, undefined);

  return (
    <div className="space-y-3">
      {logoUrl ? (
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo vinda do Storage; o otimizador de imagem não roda nesta arquitetura */}
          <img src={logoUrl} alt="Logo atual" className="h-16 w-auto max-w-[16rem] object-contain" />
        </div>
      ) : (
        <p className="text-sm text-slate-500">Nenhuma logo enviada ainda.</p>
      )}
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/webp"
          required
          className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
        />
        <SubmitButton variant="secondary" pendingLabel="Enviando...">
          {personalizada ? "Trocar logo" : "Enviar logo"}
        </SubmitButton>
        {personalizada && (
          <button
            type="submit"
            formAction={removerLogo}
            formNoValidate
            className="text-sm font-medium text-red-700 hover:underline"
          >
            Remover
          </button>
        )}
      </form>
      {state?.erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.erro}</p>}
      {state?.sucesso && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Logo atualizada.</p>}
    </div>
  );
}
