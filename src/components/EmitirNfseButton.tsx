"use client";

import { useActionState } from "react";
import { emitirNfseAction, type EstadoEmissaoNFSe } from "@/app/(app)/ordens-servico/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Receipt } from "lucide-react";

export function EmitirNfseButton({ osId }: { osId: string }) {
  const acaoComId = emitirNfseAction.bind(null, osId);
  const [state, action] = useActionState<EstadoEmissaoNFSe, FormData>(acaoComId, undefined);

  return (
    <form action={action} className="inline-flex flex-col items-end gap-1">
      <SubmitButton variant="secondary" pendingLabel="Emitindo...">
        <Receipt className="h-4 w-4" /> Emitir NFS-e
      </SubmitButton>
      {state?.erro && (
        <p className="max-w-xs text-right text-xs text-red-600">{state.erro}</p>
      )}
    </form>
  );
}
