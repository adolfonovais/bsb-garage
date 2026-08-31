import { criarCliente } from "@/app/(app)/clientes/actions";
import { Button, Card, Field, Input, PageHeader, Textarea } from "@/components/ui";

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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
