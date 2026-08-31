import { Pencil } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { DetailsForm, type EstadoSimples } from "@/components/DetailsForm";

type VeiculoAction = (prevState: EstadoSimples, formData: FormData) => Promise<EstadoSimples>;

export function EditarVeiculoForm({
  veiculo,
  atualizarVeiculo,
}: {
  veiculo: { modelo: string; placa: string | null; cor: string | null; ano: number | null };
  atualizarVeiculo: VeiculoAction;
}) {
  return (
    <DetailsForm
      resumo={<Pencil className="h-4 w-4 text-slate-400 hover:text-amber-700" />}
      action={atualizarVeiculo}
      formClassName="mt-3 grid grid-cols-2 gap-3"
    >
      <div className="col-span-2">
        <Field label="Modelo *">
          <Input name="modelo" defaultValue={veiculo.modelo} required />
        </Field>
      </div>
      <Field label="Placa">
        <Input name="placa" defaultValue={veiculo.placa ?? ""} className="uppercase" />
      </Field>
      <Field label="Cor">
        <Input name="cor" defaultValue={veiculo.cor ?? ""} />
      </Field>
      <Field label="Ano">
        <Input name="ano" type="number" defaultValue={veiculo.ano ?? ""} />
      </Field>
      <div className="col-span-2 flex justify-end">
        <Button type="submit">Salvar</Button>
      </div>
    </DetailsForm>
  );
}

export function NovoVeiculoForm({ criarVeiculo }: { criarVeiculo: VeiculoAction }) {
  return (
    <DetailsForm
      resumo="+ Adicionar veículo"
      detailsClassName="rounded-md border border-dashed border-slate-300 p-3"
      action={criarVeiculo}
      formClassName="mt-3 grid grid-cols-2 gap-3"
      limparAoSalvar
    >
      <div className="col-span-2">
        <Field label="Modelo *">
          <Input name="modelo" required />
        </Field>
      </div>
      <Field label="Placa">
        <Input name="placa" className="uppercase" />
      </Field>
      <Field label="Cor">
        <Input name="cor" />
      </Field>
      <Field label="Ano">
        <Input name="ano" type="number" />
      </Field>
      <div className="col-span-2 flex justify-end">
        <Button type="submit">Adicionar</Button>
      </div>
    </DetailsForm>
  );
}
