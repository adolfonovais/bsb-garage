import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { criarRepasse } from "@/app/(app)/repasses/actions";
import { Card, Field, Input, LinkButton, PageHeader, Textarea } from "@/components/ui";
import { RepasseVeiculoCampos } from "@/components/RepasseVeiculoCampos";
import { SubmitButton } from "@/components/SubmitButton";
import { formatarData, paraNumero } from "@/lib/format";

export default async function NovoRepassePage({
  searchParams,
}: {
  searchParams: Promise<{ oficinaId?: string }>;
}) {
  const { oficinaId } = await searchParams;

  const [oficinas, ordensRaw, repassesAbertos, repassesComOS] = await Promise.all([
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
    // Repasses ainda válidos (cancelado libera o item de novo), com qual
    // prestador recebeu e quais itens cada um registrou ter coberto — usado
    // pra esconder do formulário só o que já foi pra ESSE MESMO prestador
    // (outro prestador pode receber o mesmo item, ex: lanternagem numa
    // oficina e pintura em outra).
    prisma.repasseOficina.findMany({
      where: { status: { not: "CANCELADO" }, osId: { not: null } },
      select: { osId: true, oficinaId: true, itens: { select: { itemId: true } } },
    }),
  ]);

  // Repasses feitos ANTES dessa funcionalidade (ou sem nenhum item marcado)
  // não têm RepasseItem — não dá pra saber qual item específico cobriram,
  // então a OS inteira fica marcada como já repassada PRA AQUELE prestador.
  // Quando o repasse marcou itens específicos, só esses ficam marcados.
  const oficinaIdsTotaisPorOS = new Map<string, Set<string>>();
  const oficinaIdsPorItem = new Map<string, Set<string>>();
  for (const r of repassesComOS) {
    if (r.itens.length === 0) {
      if (r.osId) {
        const atual = oficinaIdsTotaisPorOS.get(r.osId) ?? new Set<string>();
        atual.add(r.oficinaId);
        oficinaIdsTotaisPorOS.set(r.osId, atual);
      }
    } else {
      for (const it of r.itens) {
        const atual = oficinaIdsPorItem.get(it.itemId) ?? new Set<string>();
        atual.add(r.oficinaId);
        oficinaIdsPorItem.set(it.itemId, atual);
      }
    }
  }

  // Decimal do Prisma não atravessa a fronteira server->client component;
  // convertido pra número antes de passar pro RepasseVeiculoCampos. Cada
  // item leva a lista de prestadores que já o receberam — o filtro real
  // (por prestador selecionado no formulário) acontece no client component.
  const ordens = ordensRaw.map((os) => {
    const oficinasTotais = oficinaIdsTotaisPorOS.get(os.id);
    return {
      ...os,
      itens: os.itens.map((item) => ({
        id: item.id,
        descricao: item.descricao,
        valorTotal: paraNumero(item.valorTotal),
        tipoServicoNome: item.tipoServico?.nome ?? null,
        oficinaIdsJaRepassados: [
          ...new Set([...(oficinaIdsPorItem.get(item.id) ?? []), ...(oficinasTotais ?? [])]),
        ],
      })),
    };
  });

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
            <RepasseVeiculoCampos ordens={ordens} oficinas={oficinas} oficinaIdInicial={oficinaId ?? ""} />
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
