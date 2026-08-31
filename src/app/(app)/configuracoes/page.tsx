import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  atualizarEmpresa,
  alternarAtivoUsuario,
  atualizarUsuario,
  criarUsuario,
} from "@/app/(app)/configuracoes/actions";
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { DetailsForm } from "@/components/DetailsForm";
import { nfseConfigurada } from "@/lib/nfse";
import { whatsappConfigurado } from "@/lib/whatsapp";
import { CheckCircle2, Circle } from "lucide-react";

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (session?.user.papel !== "ADMIN") redirect("/dashboard");

  const [empresa, usuarios] = await Promise.all([
    prisma.empresaConfig.findUnique({ where: { id: 1 } }),
    prisma.usuario.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Configurações" subtitle="Dados da empresa e usuários do sistema" />

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Dados da empresa (usados no cabeçalho de Orçamentos e Ordens de Serviço)
        </h2>
        <form action={atualizarEmpresa} className="space-y-4">
          <Field label="Nome fantasia *">
            <Input name="nome" defaultValue={empresa?.nome ?? "BSB Garage Martelinho de Ouro"} required />
          </Field>
          <Field label="Razão social">
            <Input name="razaoSocial" defaultValue={empresa?.razaoSocial ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="CNPJ">
              <Input name="cnpj" defaultValue={empresa?.cnpj ?? ""} />
            </Field>
            <Field label="Inscrição Estadual">
              <Input name="ie" defaultValue={empresa?.ie ?? ""} />
            </Field>
          </div>
          <Field label="Telefones">
            <Input name="telefones" defaultValue={empresa?.telefones ?? ""} />
          </Field>
          <Field label="Endereço">
            <Textarea name="endereco" rows={2} defaultValue={empresa?.endereco ?? ""} />
          </Field>
          <Field label="Cidade / UF *">
            <Input name="cidadeUf" defaultValue={empresa?.cidadeUf ?? "Brasília - DF"} required />
          </Field>
          <div className="flex justify-end">
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Usuários</h2>
        <div className="mb-4 space-y-2">
          {usuarios.map((u) => (
            <div key={u.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{u.nome}</p>
                  <p className="text-xs text-slate-500">
                    {u.email} · {u.papel === "ADMIN" ? "Administrador" : "Funcionário"}
                  </p>
                </div>
                <form action={alternarAtivoUsuario.bind(null, u.id, !u.ativo)}>
                  <Button type="submit" variant={u.ativo ? "secondary" : "primary"}>
                    {u.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </form>
              </div>
              <DetailsForm
                resumo="Editar usuário"
                detailsClassName="mt-2"
                action={atualizarUsuario.bind(null, u.id)}
                formClassName="mt-2 flex flex-wrap items-end gap-2"
              >
                <div className="min-w-[160px] flex-1">
                  <Field label="Nome *">
                    <Input name="nome" defaultValue={u.nome} required minLength={2} />
                  </Field>
                </div>
                <div className="min-w-[160px] flex-1">
                  <Field label="Nova senha">
                    <Input name="novaSenha" type="password" placeholder="Deixe em branco pra manter" minLength={6} />
                  </Field>
                </div>
                <Button type="submit" variant="secondary">
                  Salvar
                </Button>
              </DetailsForm>
            </div>
          ))}
        </div>

        <DetailsForm
          resumo="+ Novo usuário"
          detailsClassName="rounded-md border border-dashed border-slate-300 p-3"
          action={criarUsuario}
          formClassName="mt-3 grid grid-cols-2 gap-3"
          limparAoSalvar
        >
          <Field label="Nome *">
            <Input name="nome" required />
          </Field>
          <Field label="E-mail *">
            <Input name="email" type="email" required />
          </Field>
          <Field label="Senha inicial *">
            <Input name="senha" type="password" required minLength={6} />
          </Field>
          <Field label="Papel *">
            <Select name="papel" defaultValue="FUNCIONARIO">
              <option value="FUNCIONARIO">Funcionário</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </Field>
          <div className="col-span-2 flex justify-end">
            <Button type="submit">Criar usuário</Button>
          </div>
        </DetailsForm>
      </Card>

      <Card className="p-6">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Integrações</h2>
        <p className="mb-4 text-xs text-slate-500">
          Recursos que dependem de contas/aprovações externas — o sistema já está pronto para
          ativá-los assim que estiverem disponíveis.
        </p>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            {nfseConfigurada() ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            )}
            <div>
              <p className="font-medium text-slate-900">Emissão de NFS-e</p>
              <p className="text-xs text-slate-500">
                Pendente: escolher um provedor (Focus NFe, eNotas ou PlugNotas), obter certificado
                digital A1 da empresa e confirmar o CNPJ emissor.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-2">
            {whatsappConfigurado() ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            )}
            <div>
              <p className="font-medium text-slate-900">Aviso por WhatsApp (Maytra)</p>
              <p className="text-xs text-slate-500">
                Pendente: aprovação do app Maytra pela Meta. Até lá, o aviso de OS concluída sai
                só por e-mail.
              </p>
            </div>
          </li>
        </ul>
      </Card>
    </div>
  );
}
