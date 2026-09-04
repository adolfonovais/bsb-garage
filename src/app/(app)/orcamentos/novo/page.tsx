import { prisma } from "@/lib/prisma";
import { criarOrcamento } from "@/app/(app)/orcamentos/actions";
import { Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { ClienteVeiculoPicker } from "@/components/ClienteVeiculoPicker";
import { ItensEditor } from "@/components/ItensEditor";
import { SubmitButton } from "@/components/SubmitButton";
import { PECAS_CARROCERIA } from "@/lib/pecas-carro";

export default async function NovoOrcamentoPage() {
  const [clientes, tiposServico] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, veiculos: { select: { id: true, modelo: true, placa: true } } },
    }),
    prisma.tipoServico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo orçamento" />
      <Card className="p-6">
        <form action={criarOrcamento} className="space-y-6">
          <ClienteVeiculoPicker clientes={clientes} />

          <Field label="Validade (dias)">
            <Input name="validadeDias" type="number" defaultValue={60} className="max-w-[150px]" />
          </Field>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Itens do orçamento</h2>
            <ItensEditor tiposServico={tiposServico} pecas={PECAS_CARROCERIA} mostrarQuantidade={false} />
          </div>

          <Field label="Observações">
            <Textarea name="observacoes" rows={3} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <SubmitButton>Salvar orçamento</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
