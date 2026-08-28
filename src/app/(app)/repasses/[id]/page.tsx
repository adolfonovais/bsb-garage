import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  atualizarRepasse,
  atualizarStatusPagamentoOficina,
  atualizarStatusRepasse,
  excluirRepasse,
} from "@/app/(app)/repasses/actions";
import { Badge, Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import {
  formatarMoeda,
  numeroFormatado,
  paraInputDate,
  STATUS_PAGAMENTO_OFICINA_LABEL,
  STATUS_REPASSE_LABEL,
} from "@/lib/format";
import { Trash2 } from "lucide-react";

export default async function RepasseDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [repasse, oficinas] = await Promise.all([
    prisma.repasseOficina.findUnique({
      where: { id },
      include: { oficina: true, os: true },
    }),
    prisma.oficinaTerceirizada.findMany({ orderBy: { nome: "asc" } }),
  ]);

  if (!repasse) notFound();

  const atualizarComId = atualizarRepasse.bind(null, repasse.id);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={`Repasse — ${repasse.carro}`}
        subtitle={repasse.oficina.nome}
        actions={
          <>
            <Badge status={repasse.status} label={STATUS_REPASSE_LABEL[repasse.status]} />
            <Badge
              status={repasse.statusPagamentoOficina}
              label={STATUS_PAGAMENTO_OFICINA_LABEL[repasse.statusPagamentoOficina]}
            />
          </>
        }
      />

      {repasse.os && (
        <p className="text-sm text-slate-600">
          Vinculado à{" "}
          <Link href={`/ordens-servico/${repasse.os.id}`} className="font-medium text-amber-700 hover:underline">
            OS {numeroFormatado(repasse.os.numero, repasse.os.ano)}
          </Link>
        </p>
      )}

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm font-medium text-slate-700">Status do serviço:</span>
        {repasse.status !== "ENTREGUE" && (
          <form action={atualizarStatusRepasse.bind(null, repasse.id, "ENTREGUE")}>
            <Button type="submit" variant="secondary">
              Marcar entregue
            </Button>
          </form>
        )}
        {repasse.status !== "CANCELADO" && (
          <form action={atualizarStatusRepasse.bind(null, repasse.id, "CANCELADO")}>
            <Button type="submit" variant="ghost">
              Cancelar
            </Button>
          </form>
        )}
        <span className="ml-4 text-sm font-medium text-slate-700">Pagamento à oficina:</span>
        {repasse.statusPagamentoOficina !== "PAGO" ? (
          <form action={atualizarStatusPagamentoOficina.bind(null, repasse.id, "PAGO")}>
            <Button type="submit">Marcar como pago</Button>
          </form>
        ) : (
          <form action={atualizarStatusPagamentoOficina.bind(null, repasse.id, "PENDENTE")}>
            <Button type="submit" variant="secondary">
              Marcar como pendente
            </Button>
          </form>
        )}
      </Card>

      <Card className="p-6">
        <form action={atualizarComId} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Oficina *">
              <Select name="oficinaId" defaultValue={repasse.oficinaId} required>
                {oficinas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <input type="hidden" name="osId" value={repasse.osId ?? ""} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Carro *">
              <Input name="carro" defaultValue={repasse.carro} required />
            </Field>
            <Field label="Placa">
              <Input name="placa" defaultValue={repasse.placa ?? ""} className="uppercase" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Data de entrada *">
              <Input name="dataEntrada" type="date" defaultValue={paraInputDate(repasse.dataEntrada)} required />
            </Field>
            <Field label="Data de saída">
              <Input name="dataSaida" type="date" defaultValue={paraInputDate(repasse.dataSaida)} />
            </Field>
            <Field label="Qtd. peças">
              <Input name="qtdPecas" type="number" min="1" defaultValue={repasse.qtdPecas} />
            </Field>
          </div>

          <Field label="Tipo de serviço *">
            <Input name="tipoServico" defaultValue={repasse.tipoServico} required />
          </Field>
          <Field label="Serviço adicional">
            <Textarea name="servicoAdicional" rows={2} defaultValue={repasse.servicoAdicional ?? ""} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Valor cobrado do cliente *">
              <Input name="valorCobrado" type="number" step="0.01" min="0" defaultValue={String(repasse.valorCobrado)} required />
            </Field>
            <Field label="Custo cobrado pela oficina *">
              <Input name="custoOficina" type="number" step="0.01" min="0" defaultValue={String(repasse.custoOficina)} required />
            </Field>
            <Field label="Outros custos">
              <Input
                name="outrosCustos"
                type="number"
                step="0.01"
                min="0"
                defaultValue={repasse.outrosCustos ? String(repasse.outrosCustos) : ""}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="polimento"
              defaultChecked={repasse.polimento}
              className="h-4 w-4 rounded border-slate-300"
            />
            Inclui polimento
          </label>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
            <span>
              Custo total: <strong>{formatarMoeda(repasse.custoTotal)}</strong> · Lucro:{" "}
              <strong className="text-emerald-700">{formatarMoeda(repasse.lucro)}</strong>
            </span>
            <Button type="submit">Salvar alterações</Button>
          </div>
        </form>
      </Card>

      <Card className="flex justify-end p-4">
        <form action={excluirRepasse.bind(null, repasse.id)}>
          <Button type="submit" variant="ghost">
            <Trash2 className="h-4 w-4" /> Excluir repasse
          </Button>
        </form>
      </Card>
    </div>
  );
}
