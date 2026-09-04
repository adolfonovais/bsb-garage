import { prisma } from "@/lib/prisma";
import { criarOS } from "@/app/(app)/ordens-servico/actions";
import { Card, Field, Input, LinkButton, PageHeader, Select, Textarea } from "@/components/ui";
import { ClienteVeiculoPicker } from "@/components/ClienteVeiculoPicker";
import { ItensEditor } from "@/components/ItensEditor";
import { SubmitButton } from "@/components/SubmitButton";
import { PECAS_CARROCERIA } from "@/lib/pecas-carro";

const FORMAS_PAGAMENTO = [
  "Dinheiro",
  "PIX",
  "Débito",
  "Crédito 1x",
  "Crédito 2x",
  "Crédito 3x",
  "Crédito 4x",
  "Transferência",
];

export default async function NovaOSPage() {
  const [clientes, tiposServico] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, veiculos: { select: { id: true, modelo: true, placa: true } } },
    }),
    prisma.tipoServico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Nova Ordem de Serviço" subtitle="Para orçamentos já aprovados, use o botão 'Converter em OS' na tela do orçamento." />
      <Card className="p-6">
        <form action={criarOS} className="space-y-6">
          <ClienteVeiculoPicker clientes={clientes} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Data de entrada">
              <Input name="dataEntrada" type="date" defaultValue={hoje} />
            </Field>
            <Field label="Previsão de saída">
              <Input name="dataSaidaPrevista" type="date" />
            </Field>
            <Field label="Forma de pagamento">
              <Select name="formaPagamento" defaultValue="">
                <option value="">Selecione...</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Itens de serviço</h2>
            <ItensEditor tiposServico={tiposServico} pecas={PECAS_CARROCERIA} mostrarQuantidade={false} />
          </div>

          <Field label="Observações">
            <Textarea name="observacoes" rows={3} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <LinkButton href="/ordens-servico" variant="secondary">
              Cancelar
            </LinkButton>
            <SubmitButton>Salvar Ordem de Serviço</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
