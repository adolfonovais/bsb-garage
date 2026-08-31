import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { atualizarOrcamento } from "@/app/(app)/orcamentos/actions";
import { Button, Card, Field, Input, LinkButton, PageHeader, Textarea } from "@/components/ui";
import { ClienteVeiculoPicker } from "@/components/ClienteVeiculoPicker";
import { ItensEditor } from "@/components/ItensEditor";
import { numeroFormatado, paraNumero } from "@/lib/format";

export default async function EditarOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [orcamento, clientes, tiposServico] = await Promise.all([
    prisma.orcamento.findUnique({
      where: { id },
      include: {
        itens: { orderBy: { ordem: "asc" } },
        ordensServico: { select: { id: true, numero: true, ano: true } },
      },
    }),
    prisma.cliente.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, veiculos: { select: { id: true, modelo: true, placa: true } } },
    }),
    prisma.tipoServico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  if (!orcamento) notFound();

  const atualizarComId = atualizarOrcamento.bind(null, orcamento.id);
  const itensIniciais = orcamento.itens.map((item) => ({
    descricao: item.descricao,
    quantidade: String(paraNumero(item.quantidade)),
    valorUnit: String(paraNumero(item.valorUnit)),
    tipoServicoId: item.tipoServicoId ?? "",
  }));

  return (
    <div className="max-w-3xl">
      <PageHeader title={`Editar orçamento ${numeroFormatado(orcamento.numero, orcamento.ano)}`} />
      {orcamento.ordensServico.length > 0 && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Esse orçamento já foi convertido na OS{" "}
          {numeroFormatado(orcamento.ordensServico[0].numero, orcamento.ordensServico[0].ano)} — salvar aqui
          atualiza os itens/observações dela também.
        </p>
      )}
      <Card className="p-6">
        <form action={atualizarComId} className="space-y-6">
          <ClienteVeiculoPicker
            clientes={clientes}
            clienteIdInicial={orcamento.clienteId}
            veiculoIdInicial={orcamento.veiculoId ?? undefined}
          />

          <Field label="Validade (dias)">
            <Input name="validadeDias" type="number" defaultValue={orcamento.validadeDias} className="max-w-[150px]" />
          </Field>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Itens do orçamento</h2>
            <ItensEditor tiposServico={tiposServico} itensIniciais={itensIniciais} />
          </div>

          <Field label="Observações">
            <Textarea name="observacoes" rows={3} defaultValue={orcamento.observacoes ?? ""} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <LinkButton href={`/orcamentos/${orcamento.id}`} variant="secondary">
              Cancelar
            </LinkButton>
            <Button type="submit">Salvar alterações</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
