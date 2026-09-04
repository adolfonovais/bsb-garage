import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { criarRepasse } from "@/app/(app)/repasses/actions";
import { Card, Field, Input, LinkButton, PageHeader, Select, Textarea } from "@/components/ui";
import { RepasseVeiculoCampos } from "@/components/RepasseVeiculoCampos";
import { SubmitButton } from "@/components/SubmitButton";
import { formatarData, paraNumero } from "@/lib/format";

export default async function NovoRepassePage({
  searchParams,
}: {
  searchParams: Promise<{ oficinaId?: string }>;
}) {
  const { oficinaId } = await searchParams;

  const [oficinas, ordensRaw, repassesAbertos, itensJaRepassados] = await Promise.all([
    prisma.oficinaTerceirizada.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.ordemServico.findMany({
      where: { status: { not: "CANCELADA" } },
      include: {
        cliente: true,
        veiculo: true,
        itens: { orderBy: { ordem: "asc" }, include: { tipoServico: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    // "Já repassado, ainda não entregue" — visão rápida do que já está com
    // algum prestador antes de criar mais um repasse.
    prisma.repasseOficina.findMany({
      where: { status: "EM_ANDAMENTO" },
      include: { oficina: true },
      orderBy: { dataEntrada: "desc" },
    }),
    prisma.repasseItem.findMany({ select: { itemId: true } }),
  ]);

  const itemIdsJaRepassados = new Set(itensJaRepassados.map((r) => r.itemId));

  // Decimal do Prisma não atravessa a fronteira server->client component;
  // convertido pra número antes de passar pro RepasseVeiculoCampos. Também
  // tira os itens que já foram repassados antes (pra não repassar o mesmo
  // serviço duas vezes) e some com a OS inteira do dropdown se não sobrar
  // nenhum item dela pra repassar.
  const ordens = ordensRaw
    .map((os) => {
      const itensRestantes = os.itens.filter((item) => !itemIdsJaRepassados.has(item.id));
      return {
        ...os,
        totalItensOriginais: os.itens.length,
        itens: itensRestantes.map((item) => ({
          id: item.id,
          descricao: item.descricao,
          valorTotal: paraNumero(item.valorTotal),
          tipoServicoNome: item.tipoServico?.nome ?? null,
        })),
      };
    })
    .filter((os) => os.totalItensOriginais === 0 || os.itens.length > 0);

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo repasse" subtitle="Registro de serviço enviado para um prestador terceirizado" />

      {repassesAbertos.length > 0 && (
        <Card className="mb-6 overflow-x-auto">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Já repassado, ainda não entregue</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Entrada</th>
                <th className="px-4 py-2">Prestador</th>
                <th className="px-4 py-2">Carro</th>
                <th className="px-4 py-2">Serviço</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {repassesAbertos.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/repasses/${r.id}`} className="font-medium text-amber-700 hover:underline">
                      {formatarData(r.dataEntrada)}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{r.oficina.nome}</td>
                  <td className="px-4 py-2">
                    {r.carro} {r.placa ? `· ${r.placa}` : ""}
                  </td>
                  <td className="px-4 py-2">{r.tipoServico}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

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
