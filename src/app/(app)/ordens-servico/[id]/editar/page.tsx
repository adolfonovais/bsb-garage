import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { atualizarOS } from "@/app/(app)/ordens-servico/actions";
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ClienteVeiculoPicker } from "@/components/ClienteVeiculoPicker";
import { ItensEditor } from "@/components/ItensEditor";
import { numeroFormatado, paraNumero } from "@/lib/format";

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

export default async function EditarOSPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [os, clientes, tiposServico] = await Promise.all([
    prisma.ordemServico.findUnique({
      where: { id },
      include: {
        itens: { orderBy: { ordem: "asc" } },
        origemOrcamento: { select: { numero: true, ano: true } },
      },
    }),
    prisma.cliente.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, veiculos: { select: { id: true, modelo: true, placa: true } } },
    }),
    prisma.tipoServico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  if (!os) notFound();

  const atualizarComId = atualizarOS.bind(null, os.id);
  const itensIniciais = os.itens.map((item) => ({
    descricao: item.descricao,
    quantidade: String(paraNumero(item.quantidade)),
    valorUnit: String(paraNumero(item.valorUnit)),
    tipoServicoId: item.tipoServicoId ?? "",
  }));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Editar OS ${numeroFormatado(os.numero, os.ano)}`}
        subtitle="Alterações não mudam o número da OS nem o histórico de fotos/pagamentos."
      />
      {os.origemOrcamento && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Essa OS veio do orçamento {numeroFormatado(os.origemOrcamento.numero, os.origemOrcamento.ano)} — salvar
          aqui atualiza os itens/observações dele também.
        </p>
      )}
      <Card className="p-6">
        <form action={atualizarComId} className="space-y-6">
          <ClienteVeiculoPicker
            clientes={clientes}
            clienteIdInicial={os.clienteId}
            veiculoIdInicial={os.veiculoId ?? undefined}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Data de entrada">
              <Input name="dataEntrada" type="date" defaultValue={os.dataEntrada.toISOString().slice(0, 10)} />
            </Field>
            <Field label="Previsão de saída">
              <Input
                name="dataSaidaPrevista"
                type="date"
                defaultValue={os.dataSaidaPrevista?.toISOString().slice(0, 10) ?? ""}
              />
            </Field>
            <Field label="Forma de pagamento">
              <Select name="formaPagamento" defaultValue={os.formaPagamento ?? ""}>
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
            <ItensEditor tiposServico={tiposServico} itensIniciais={itensIniciais} />
          </div>

          <Field label="Observações">
            <Textarea name="observacoes" rows={3} defaultValue={os.observacoes ?? ""} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Salvar alterações</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
