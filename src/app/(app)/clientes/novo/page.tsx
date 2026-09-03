import { criarCliente } from "@/app/(app)/clientes/actions";
import { Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default function NovoClientePage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="Novo cliente" />
      <Card className="p-6">
        <form action={criarCliente} className="space-y-4">
          <Field label="Nome *">
            <Input name="nome" required autoFocus />
          </Field>
          <Field label="CPF">
            <Input name="cpf" placeholder="000.000.000-00" />
          </Field>
          <Field label="Telefone">
            <Input name="telefone" placeholder="(61) 90000-0000" />
          </Field>
          <Field label="E-mail">
            <Input type="email" name="email" />
          </Field>
          <Field label="Endereço">
            <Textarea name="endereco" rows={2} />
          </Field>
          <p className="text-xs text-slate-500">
            Endereço detalhado abaixo — necessário pra emitir NFS-e (Nota Fiscal) pra esse cliente.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="CEP">
              <Input name="cep" placeholder="00000-000" />
            </Field>
            <Field label="Bairro">
              <Input name="bairro" />
            </Field>
            <Field label="Logradouro (rua, avenida...)">
              <Input name="logradouro" />
            </Field>
            <Field label="Número">
              <Input name="numero" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <SubmitButton>Salvar</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
