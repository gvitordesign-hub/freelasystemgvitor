# Plano de Execução — Auditoria de Dados, Fluxo de Caixa e Interface

> **Objetivo:** tornar os dados do Supabase fiéis (sem duplicatas, sem valores só no navegador, sem datas erradas), unificar a regra de pagamento (Nota → Fluxo de Caixa) e deixar a interface mais legível e profissional — sem mudar a ideia do sistema.
>
> **Princípio:** a **nota (invoice) é a fonte da verdade do recebimento**. O banco garante a consistência (função SQL + índice único); a interface só chama e mostra o resultado.
>
> **Forma de trabalho:** uma etapa = um commit pequeno em `main`, com `npx tsc --noEmit` + `npm run build` passando. Etapas marcadas com 🧑 dependem de você (rodar SQL no painel do Supabase / testar no app logado).

---

## Fase 0 — Preparação (≈10 min)

| # | Tarefa | Quem |
|---|---|---|
| 0.1 | Backup: Supabase → *Database → Backups* (ou exportar CSV de `invoices`, `transactions`, `tasks`) | 🧑 |
| 0.2 | Criar `supabase/migrations/20261110120000_schema_sync_and_payment_rpc.sql` (Fase 1.1 + 1.2) | Claude |

**Pronto quando:** backup feito e arquivo SQL revisado por você.

---

## Fase 1 — Dados fiéis (prioridade máxima)

### 1.1 Alinhar o schema remoto 🧑
SQL idempotente (pode rodar mais de uma vez):
- `invoices.custom_value DECIMAL(12,2)`, `tasks.deliverables JSONB DEFAULT '[]'`, `albums.assets JSONB DEFAULT '[]'`.
- Migrar valores do localStorage: a tela de Configurações ganha um botão temporário **"Enviar dados locais para o banco"** que lê `invoice_custom_values_cache` / `task_deliverables_cache` e grava nas colunas novas; marcadores `<!--GV_DELIVERABLES-->` do briefing são convertidos para a coluna.
- `NOTIFY pgrst, 'reload schema';`

**Teste:** a consulta `select=custom_value` deixa de retornar erro 42703.

### 1.2 Regra de pagamento no banco
- Função `pay_invoice(p_invoice_id uuid, p_paid_at date, p_method text default null)` — `SECURITY INVOKER` (respeita RLS), em uma transação:
  1. marca a nota `Pago` + `paid_at`;
  2. marca tarefas da nota como `Concluído`;
  3. faz *upsert* de **uma transação por tarefa** (rateio do `custom_value` com ajuste dos centavos na última) ou **uma transação da nota** quando não há tarefas; data = `p_paid_at`.
- Função `reopen_invoice(p_invoice_id uuid)` — volta nota e transações vinculadas a `Pendente` (não apaga nada).
- Índices únicos parciais: `transactions(task_id) WHERE type='Entrada' AND task_id IS NOT NULL` e `transactions(invoice_id) WHERE type='Entrada' AND task_id IS NULL`.
- **Antes do índice:** script de limpeza de duplicatas — primeiro um `SELECT` que lista as duplicadas para você conferir, depois o `DELETE` mantendo a mais antiga. 🧑

**Teste:** pagar a mesma nota 2× não cria transação nova; o índice impede duplicata mesmo com duas abas abertas.

### 1.3 Limpar `src/lib/database.ts`
- Remover todos os fallbacks de localStorage/briefing (`custom_value`, `deliverables`, `invoice_id`) e o *retry* que descartava `paid_at`.
- Erro de coluna ausente vira erro real com mensagem clara.
- Adicionar `db.invoices.pay()` / `db.invoices.reopen()` (via `supabase.rpc`) e `db.transactions.update/delete` já usados pela UI.
- Normalizar números (`Number(value)`) num único *mapper* por tabela.

### 1.4 Simplificar `DashboardPage.tsx`
- **Remover** `reconcileInvoicesAndTransactions` do `fetchData` (fim das duplicatas e do “ping-pong”). Vira um botão **“Verificar consistência”** em Configurações, que só *mostra* divergências.
- `updateInvoice` passa a salvar **apenas** campos editados (título, notas, valor). Observações não tocam mais em transações.
- Pagar/reabrir nota → `db.invoices.pay/reopen` + recarregar `invoices`, `tasks`, `transactions`.
- `PaymentModal` (“Sim, recebi”) numa tarefa **com nota** → chama `pay_invoice` da nota (com confirmação: “isso quita a nota X inteira”); **sem nota** → cria/atualiza a transação da tarefa com a data de hoje (local).
- `handleBudgetApprove`: não criar a transação “Projeto: X” solta; o valor previsto vem das tarefas da nota.
- `deleteTask`: perguntar se mantém ou remove as transações vinculadas, e fazer o mesmo no banco.

### 1.5 Sincronização confiável
- Um canal realtime, uma inscrição por tabela, com filtro `user_id=eq.<id>`, **debounce de 500 ms** e recarga só da tabela que mudou.
- Remover o polling de 10 s (manter recarga no `focus`/`online`).
- Contador de requisição: resposta antiga nunca sobrescreve resposta nova.
- Se uma tabela falhar ao carregar, manter os dados anteriores e mostrar aviso (nunca tratar como lista vazia).

### 1.6 Datas no fuso local
- Trocar os 9 `toISOString().split('T')[0]` por `getLocalDateString()`.
- `paid_at` passa a ser lido como data local na exibição.

**Pronto quando (Fase 1):** roteiro de teste 🧑 abaixo passa em PC e celular ao mesmo tempo.

> **Roteiro:** (a) criar nota com 2 tarefas, editar valor total, pagar → 2 lançamentos no caixa na data escolhida, soma = valor editado; (b) digitar observação na nota → caixa não muda; (c) reabrir → lançamentos voltam a Pendente; (d) abrir no celular → mesmos valores; (e) 1 minuto parado → nada muda sozinho.

---

## Fase 2 — Fluxo de Caixa utilizável + feedback

### 2.1 Sistema de avisos (toasts)
- `src/components/common/Toast.tsx` + `useToast()` (sem dependência nova).
- Todas as ações do `DashboardPage` mostram sucesso/erro; erro com botão “Tentar de novo”.
- Substituir `alert()`/`confirm()` nativos pelo `ConfirmModal` existente + toasts.

### 2.2 Fluxo de Caixa editável
- Por linha: **marcar pago/pendente**, **editar** (reaproveitar `TransactionModal` em modo edição), **excluir** (com confirmação).
- Lançamentos vinculados a nota: editar valor avisa “isso altera o valor da nota” ou leva à nota.
- Filtros: status, tipo, cliente; total do filtro; separar *Saídas pagas* × *Saídas a pagar*.
- Exportar CSV do mês.

### 2.3 Um único “Registrar recebimento”
- Modal novo (substitui o “Missão Concluída” para o lado financeiro): data (padrão hoje), valor, forma de pagamento, prévia “vai lançar R$ X em DD/MM”.
- Usado na nota e na tarefa.
- Coluna `transactions.method TEXT` (opcional, na mesma migration).

**Pronto quando:** dá para corrigir qualquer lançamento sem abrir o painel do Supabase.

---

## Fase 3 — Polimento visual e linguagem

| # | Tarefa |
|---|---|
| 3.1 | Tipografia: mínimo 12px texto / 11px rótulo (substituir `text-[7–10px]`); fonte Inter; `tabular-nums` em valores. |
| 3.2 | Reduzir `uppercase`/`tracking-widest` a rótulos curtos; remover `cyber-font` de números e títulos. |
| 3.3 | Animações: tirar `animate-pulse` de “Online”, streak e badges; manter só em erro/ação pendente. Respeitar `prefers-reduced-motion`. |
| 3.4 | Vocabulário: Protocolos → Configurações, Agenda de Missões → Agenda, Frella CRM → Clientes, Corporação → Empresa, status “Ativo/Inativo/Prospecção” sem sufixos, “Missão Concluída” → “Tarefa concluída”, “Diretrizes Master” → “Objetivos”. |
| 3.5 | Barra superior enxuta: meta da semana + sincronização + perfil. Streak: implementar (dias seguidos com tarefa concluída) **ou** remover — você escolhe. |
| 3.6 | Modais claros (`bg-white`) só onde é documento para o cliente (nota/orçamento/relatório impresso); resto no tema escuro. |

---

## Fase 4 — Fluidez (opcional, conforme uso)

| # | Tarefa |
|---|---|
| 4.1 | Abas na URL (`/financeiro`, `/clientes`…) com o `react-router-dom` já instalado. |
| 4.2 | Atalhos: `N` nova demanda, `D` despesa, `/` busca, `Esc` fecha modal. |
| 4.3 | Busca global `Ctrl+K` (clientes, notas, tarefas). |
| 4.4 | Agenda no celular: um dia por vez com abas; estados vazios com “+ Adicionar neste dia”. |
| 4.5 | Nota: indicador “salvo ✓” nas observações; link/PDF com PIX para o cliente. |
| 4.6 | Refatorar `DashboardPage.tsx` em hooks por domínio (`useInvoices`, `useFinance`, `useTasks`). |

---

## Ordem e checkpoints

1. **Fase 0 + 1.1–1.2** → você roda o SQL → checkpoint 🧑
2. **1.3–1.6** → roteiro de teste 🧑 → checkpoint
3. **Fase 2** → checkpoint 🧑
4. **Fase 3** → você aprova o visual
5. **Fase 4** → itens escolhidos por você

## Fora do escopo
Multiusuário, IA (plano de 2026-10-01), mudanças no deploy/VPS.
