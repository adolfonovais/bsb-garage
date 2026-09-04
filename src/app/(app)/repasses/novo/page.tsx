import { prisma } from "@/lib/prisma";
import { criarRepasse } from "@/app/(app)/repasses/actions";
import { Card, Field, Input, LinkButton, PageHeader, Select, Textarea } from "@/components/ui";
import { RepasseVeiculoCampos } from "@/components/RepasseVeiculoCampos";
import { SubmitButton } from "@/components/SubmitButton";
import { paraNumero } from "@/lib/format";

export default async function NovoRepassePage({
  searchParams,
}: {
  searchParams: Promise<{ oficinaId?: string }>;
}) {
  const { oficinaId } = await searchParams;

  const [oficinas, ordensRaw] = await Promise.all([
    prisma.oficinaTerceirizada.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.ordemServico.findMany({
      where: { status: { not: "CANCELADA" } },
      include: { cliente: true, veiculo: true, itens: { orderBy: { ordem: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  // Decimal do Prisma não atravessa a fronteira server->client component;
  // convertido pra número antes de passar pro RepasseVeiculoCampos.
  const ordens = ordensRaw.map((os) => ({
    ...os,
    itens: os.itens.map((item) => ({
      id: item.id,
      descricao: item.descricao,
      valorTotal: paraNumero(item.valorTotal),
    })),
  }));

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo repasse" subtitle="Registro de serviço enviado para um prestador terceirizado" />
      <Card className="p-6">
        <form action={criarRepasse} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prestador *">
              <Select name="oficinaId" defaultValue={oficinaId ?? ""} required>
                <option value="">Selecione...</option>
                {oficinas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <RepasseVeiculoCampos ordens={ordens} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Data de entrada *">
              <Input name="dataEntrada" type="date" defaultValue={hoje} required />
            </Field>
            <Field label="Data de saída">
              <Input name="dataSaida" type="date" />
            </Field>
            <Field label="Qtd. peças">
              <Input name="qtdPecas" type="number" min="1" defaultValue={1} />
            </Field>
          </div>

          <Field label="Serviço adicional">
            <Textarea name="servicoAdicional" rows={2} placeholder="Ex: Troca grade frontal" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Valor cobrado do cliente *">
              <Input name="valorCobrado" type="number" step="0.01" min="0" required />
            </Field>
            <Field label="Custo cobrado pelo prestador *">
              <Input name="custoOficina" type="number" step="0.01" min="0" required />
            </Field>
            <Field label="Outros custos">
              <Input name="outrosCustos" type="number" step="0.01" min="0" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="polimento" className="h-4 w-4 rounded border-slate-300" />
            Inclui polimento
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <LinkButton href="/repasses" variant="secondary">
              Cancelar
            </LinkButton>
            <SubmitButton>Salvar repasse</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
