import { prisma } from "@/lib/prisma";
import { criarRepasse } from "@/app/(app)/repasses/actions";
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { formatarVeiculo, numeroFormatado } from "@/lib/format";

export default async function NovoRepassePage({
  searchParams,
}: {
  searchParams: Promise<{ oficinaId?: string }>;
}) {
  const { oficinaId } = await searchParams;

  const [oficinas, ordens] = await Promise.all([
    prisma.oficinaTerceirizada.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.ordemServico.findMany({
      where: { status: { not: "CANCELADA" } },
      include: { cliente: true, veiculo: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo repasse" subtitle="Registro de serviço enviado para uma oficina terceirizada" />
      <Card className="p-6">
        <form action={criarRepasse} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Oficina *">
              <Select name="oficinaId" defaultValue={oficinaId ?? ""} required>
                <option value="">Selecione...</option>
                {oficinas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vincular a uma OS (opcional)" hint="Preenche carro/placa automaticamente ao salvar, se deixado em branco.">
              <Select name="osId" defaultValue="">
                <option value="">Nenhuma</option>
                {ordens.map((os) => (
                  <option key={os.id} value={os.id}>
                    {numeroFormatado(os.numero, os.ano)} — {os.cliente.nome}
                    {os.veiculo ? ` (${formatarVeiculo(os.veiculo)})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Carro *">
              <Input name="carro" required placeholder="Ex: Discovery Sport" />
            </Field>
            <Field label="Placa">
              <Input name="placa" className="uppercase" />
            </Field>
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

          <Field label="Tipo de serviço *">
            <Input name="tipoServico" required placeholder="Ex: Lanternagem/Pintura" />
          </Field>
          <Field label="Serviço adicional">
            <Textarea name="servicoAdicional" rows={2} placeholder="Ex: Troca grade frontal" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Valor cobrado do cliente *">
              <Input name="valorCobrado" type="number" step="0.01" min="0" required />
            </Field>
            <Field label="Custo cobrado pela oficina *">
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
            <Button type="submit">Salvar repasse</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
