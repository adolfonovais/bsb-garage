import { criarPeca } from "@/app/(app)/estoque/actions";
import { Card, Field, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

const UNIDADES = ["un", "m", "m²", "m³", "vb", "kg", "l"];

export default function NovaPecaPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="Novo item de estoque" />
      <Card className="p-6">
        <form action={criarPeca} className="space-y-4">
          <Field label="Nome *">
            <Input name="nome" required autoFocus placeholder="Ex: Tinta preta metálica" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Unidade *">
              <Select name="unidade" defaultValue="un" required>
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantidade mínima" hint="Avisa quando o estoque ficar abaixo disso.">
              <Input name="quantidadeMinima" type="number" step="0.01" min="0" defaultValue={0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantidade inicial em estoque">
              <Input name="quantidadeInicial" type="number" step="0.01" min="0" defaultValue={0} />
            </Field>
            <Field label="Custo unitário">
              <Input name="custoUnitario" type="number" step="0.01" min="0" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <LinkButton href="/estoque" variant="secondary">
              Cancelar
            </LinkButton>
            <SubmitButton>Salvar</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
