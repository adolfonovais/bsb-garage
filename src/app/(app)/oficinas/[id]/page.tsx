import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { atualizarOficina, alternarAtivoOficina } from "@/app/(app)/oficinas/actions";
import { Badge, Card, EmptyState, Field, Input, LinkButton, PageHeader } from "@/components/ui";
import { BotaoCancelarEdicao, EdicaoInline, FormularioComFechamento } from "@/components/EdicaoInline";
import { SubmitButton } from "@/components/SubmitButton";
import { Valor } from "@/components/ValoresPrivacidade";
import {
  formatarData,
  paraNumero,
  STATUS_PAGAMENTO_OFICINA_LABEL,
  STATUS_REPASSE_LABEL,
} from "@/lib/format";

export default async function OficinaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const oficina = await prisma.oficinaTerceirizada.findUnique({
    where: { id },
    include: { repasses: { orderBy: { dataEntrada: "desc" } } },
  });

  if (!oficina) notFound();

  const totalPecas = oficina.repasses.reduce((s, r) => s + r.qtdPecas, 0);
  const totalReceita = oficina.repasses.reduce((s, r) => s + paraNumero(r.valorCobrado), 0);
  const totalCusto = oficina.repasses.reduce((s, r) => s + paraNumero(r.custoTotal), 0);
  const totalLucro = oficina.repasses.reduce((s, r) => s + paraNumero(r.lucro), 0);

  const atualizarComId = atualizarOficina.bind(null, oficina.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={oficina.nome}
        subtitle={oficina.ativo ? "Prestador ativo" : "Prestador inativo"}
        actions={
          <>
            <LinkButton href={`/repasses/novo?oficinaId=${oficina.id}`}>Novo repasse</LinkButton>
            <form action={alternarAtivoOficina.bind(null, oficina.id, !oficina.ativo)}>
              <SubmitButton variant="secondary">
                {oficina.ativo ? "Desativar" : "Ativar"}
              </SubmitButton>
            </form>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase text-slate-500">Peças</p>
          <p className="text-xl font-bold text-slate-900">{totalPecas}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-slate-500">Receita total</p>
          <p className="text-xl font-bold text-slate-900"><Valor valor={totalReceita} /></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-slate-500">Custo total</p>
          <p className="text-xl font-bold text-slate-900"><Valor valor={totalCusto} /></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-slate-500">Lucro total</p>
          <p className="text-xl font-bold text-emerald-700"><Valor valor={totalLucro} /></p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Dados do prestador</h2>
        <EdicaoInline
          visualizacao={
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-slate-500">Nome</p>
                <p className="text-slate-900">{oficina.nome}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Contato</p>
                <p className="text-slate-900">{oficina.contato || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Telefone</p>
                <p className="text-slate-900">{oficina.telefone || "-"}</p>
              </div>
            </div>
          }
          formulario={
            <FormularioComFechamento action={atualizarComId} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Nome *">
                <Input name="nome" defaultValue={oficina.nome} required />
              </Field>
              <Field label="Contato">
                <Input name="contato" defaultValue={oficina.contato ?? ""} />
              </Field>
              <Field label="Telefone">
                <Input name="telefone" defaultValue={oficina.telefone ?? ""} />
              </Field>
              <div className="sm:col-span-3 flex justify-end gap-2">
                <BotaoCancelarEdicao />
                <SubmitButton>Salvar</SubmitButton>
              </div>
            </FormularioComFechamento>
          }
        />
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Repasses</h2>
        </div>
        {oficina.repasses.length === 0 ? (
          <div className="p-4">
            <EmptyState>Nenhum repasse registrado para esse prestador ainda.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Entrada</th>
                  <th className="px-4 py-2">Carro</th>
                  <th className="px-4 py-2">Serviço</th>
                  <th className="px-4 py-2">Cobrado</th>
                  <th className="px-4 py-2">Lucro</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {oficina.repasses.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link href={`/repasses/${r.id}`} className="font-medium text-amber-700 hover:underline">
                        {formatarData(r.dataEntrada)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      {r.carro} {r.placa ? `· ${r.placa}` : ""}
                    </td>
                    <td className="px-4 py-2">{r.tipoServico}</td>
                    <td className="px-4 py-2"><Valor valor={paraNumero(r.valorCobrado)} /></td>
                    <td className="px-4 py-2 text-emerald-700"><Valor valor={paraNumero(r.lucro)} /></td>
                    <td className="px-4 py-2">
                      <Badge status={r.status} label={STATUS_REPASSE_LABEL[r.status]} />
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        status={r.statusPagamentoOficina}
                        label={STATUS_PAGAMENTO_OFICINA_LABEL[r.statusPagamentoOficina]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
