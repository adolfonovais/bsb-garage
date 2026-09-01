import { criarOficina } from "@/app/(app)/oficinas/actions";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default function NovaOficinaPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="Nova oficina terceirizada" />
      <Card className="p-6">
        <form action={criarOficina} className="space-y-4">
          <Field label="Nome *">
            <Input name="nome" required autoFocus placeholder="Ex: JL Pintura" />
          </Field>
          <Field label="Contato (responsável)">
            <Input name="contato" />
          </Field>
          <Field label="Telefone">
            <Input name="telefone" placeholder="(61) 90000-0000" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <SubmitButton>Salvar</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
