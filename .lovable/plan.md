## Sistema de Gestão de Hemoterapia

Aplicação completa para banco de sangue / serviço de hemoterapia hospitalar, com controle de pacientes, solicitações, testes pré-transfusionais, estoque de bolsas, transfusões e reações adversas. Interface dark mode, controle granular por cargo, e validações críticas de segurança transfusional.

---

### 1. Autenticação e perfis

- Lovable Cloud (Supabase) com login e-mail/senha em `/login` e auto-cadastro em `/signup`.
- Novo usuário entra como `pending` (sem cargo, sem acesso). Gestores aprovam e atribuem o cargo na tela **Usuários** (visível só para `gestor`).
- Tabela `profiles` separada de `user_roles` (enum `app_role`) — papéis nunca ficam no profile, e usamos função `has_role(uuid, app_role)` SECURITY DEFINER para evitar recursão em RLS.
- Trigger `handle_new_user` cria automaticamente `profiles` no signup com status pendente.
- Roteamento protegido com layout `_authenticated` (redireciona para `/login`); cada rota verifica `hasAnyRole([...])` no `beforeLoad`.
- Tela "Aguardando aprovação" para usuários sem cargo ativo.

### 2. Layout e navegação

- Sidebar colapsável (shadcn) com itens filtrados por cargo conforme spec.
- Rodapé da sidebar: avatar com inicial, nome completo, cargo (badge), botão Sair.
- Header com sino de notificações (badge com contagem de reações graves não lidas + bolsas vencendo).
- Dark mode por padrão, paleta clínica em tons escuros: fundo grafite, primário azul-clínico, vermelho intenso para alertas críticos, amarelo âmbar para avisos, verde para OK. Tipografia Inter.

### 3. Dashboard (`/`)

- 4 cards com indicadores em tempo real (queries agregadas).
- **Matriz de estoque**: grid hemocomponente (CH, CP, PFC, CRIO) × tipo sanguíneo (8 colunas). Cores: 0 = cinza, 1–2 = vermelho, 3+ = verde. Clique na célula filtra estoque.
- Painel lateral: contagem por status de solicitação.
- Banner amarelo no topo se houver bolsas vencendo em < 48h (com link para estoque filtrado).

### 4. Pacientes (`/pacientes`)

- Tabela paginada (10/pág) com busca por nome/CPF/MRN, badge colorido por tipo sanguíneo, ícone de alerta se houver requisitos especiais (irradiação, CMV, alergias).
- Drawer "Novo Paciente" com todos os campos da spec, validação Zod.
- Página de detalhes `/pacientes/$id`: dados, alertas em destaque, histórico transfusional, histórico de reações.

### 5. Solicitações (`/solicitacoes`)

- Tabela com filtros (status, urgência), badge de urgência (Emergência pisca vermelho).
- Drawer "Nova Solicitação": busca de paciente com autocomplete, campos clínicos obrigatórios, justificativa de emergência condicional.
- Detalhe `/solicitacoes/$id`: dados + timeline de status à direita + botão "Iniciar Análise".

### 6. Testes pré-transfusionais (`/testes`)

- Lista de solicitações em análise / aguardando amostra.
- Tela de teste em wizard com 4 seções (tipagem, seleção de bolsa, PAI, prova cruzada).
- **Validações bloqueantes**:
  - Tipagem do paciente diferente do histórico → alerta amarelo.
  - PAI positivo sem anticorpo identificado → bloqueia "Validar".
  - Prova cruzada incompatível → modal vermelho de erro, botão de liberação desabilitado.
- "Validar e Liberar" (apenas biomédico/hemoterapeuta) → status `pronto_dispensar`, reserva a bolsa (`status = reservado`).

### 7. Estoque de Bolsas (`/estoque`)

- Aba **Estoque Atual**: tabela com filtros, validade colorida (vermelho < 48h, amarelo < 7d), ação descartar com modal de motivo.
- Aba **Entrada**: formulário com input grande para ISBT 128 (autofocus para leitor de código de barras), confirmação visual ao salvar e reset para próxima bolsa.

### 8. Transfusões (`/transfusoes`)

- Lista de dispensações prontas.
- Fluxo de início: confirmação de identidade do paciente + digitação do código da bolsa. Mismatch → alerta vermelho bloqueante.
- Bolsa vencida → impede dispensação.
- Formulário de início (sinais vitais pré, via de acesso) e término (sinais vitais pós, volume, observações).
- Botão "Registrar Reação" sempre visível durante transfusão em andamento.

### 9. Reações Adversas (`/reacoes`)

- Lista com filtros por tipo, gravidade, período.
- Formulário completo conforme spec, transfusão suspensa por padrão.
- Reação grave/fatal → cria notificação in-app (tabela `notifications`) para todos os hemoterapeutas + banner vermelho permanente no topo da app até ser marcada como lida.

### 10. Relatórios (`/relatorios`)

- Dashboards simples com gráficos (recharts): transfusões por período, taxa de descarte, reações por tipo, consumo por hemocomponente. Acesso só hemoterapeuta/gestor.

### 11. Usuários (`/usuarios`) — só gestor

- Lista de profiles pendentes e ativos.
- Atribuir/alterar cargo, ativar/desativar.

### 12. Banco de dados

Todas as tabelas da spec criadas com enums Postgres apropriados. RLS habilitado em todas:

- Leitura: qualquer usuário autenticado **com cargo ativo**.
- Escrita: restrita por cargo via `has_role()` (ex.: só biomédico/hemoterapeuta valida testes; só hemoterapeuta/biomédico/técnico registra entrada de bolsa).
- `user_roles` separada com enum `app_role` (hemoterapeuta, biomedico, tecnico, enfermeiro, medico, gestor).
- Tabela extra `notifications` (id, user_id, type, severity, title, body, read_at, created_at, related_id).
- Triggers: `handle_new_user`, `updated_at` automático, e trigger que ao inserir `adverse_reactions` com severidade grave/fatal cria notificações para todos os hemoterapeutas.

### 13. Seed de demonstração

- 1 usuário gestor demo (`gestor@demo.com` / senha exibida na tela inicial após criação) já aprovado.
- 1 usuário de cada cargo aprovado.
- ~10 pacientes fictícios variados.
- ~30 bolsas em diferentes status e validades (incluindo algumas vencendo em < 48h para o alerta).
- ~8 solicitações em vários status, 2 transfusões concluídas, 1 reação leve registrada.

### 14. UX e qualidade

- Toasts (sonner) verde/vermelho/amarelo para todas as ações.
- Skeletons em tabelas e cards.
- Paginação 10/página, validação Zod em todos os formulários, asterisco vermelho em obrigatórios.
- Refetch automático via TanStack Query após mutações.
- Responsivo desktop + tablet (sidebar vira sheet em < 768px).

---

### Detalhes técnicos

- **Stack**: TanStack Start + React 19 + Tailwind v4 + shadcn (já no projeto) + TanStack Query + Zod + sonner + recharts + Lovable Cloud (Supabase).
- **Rotas**: `_authenticated.tsx` layout protegido; rotas-filhas por módulo. `/login` e `/signup` públicas.
- **Auth e RLS**: papel em `user_roles` + `has_role()` SECURITY DEFINER; `requireSupabaseAuth` middleware nos server functions sensíveis; client browser para queries comuns sob RLS.
- **Server functions**: agregações do dashboard e validações que precisam de privilégios (ex.: aprovar usuário, atribuir cargo) ficam em `*.functions.ts` com middleware de auth + checagem de role gestor.
- **Validações críticas**: implementadas tanto no frontend (Zod + estado de UI) quanto no backend (constraints, checks e RLS) — bolsa vencida não pode mudar para `dispensado` (check constraint), prova cruzada incompatível bloqueia trigger de reserva.
- **Notificações**: tabela `notifications` + realtime subscription do Supabase para sino atualizar em tempo real.
- **Migrations**: uma migration inicial cria enums, tabelas, RLS, funções, triggers e seed.

```text
src/routes/
  __root.tsx
  index.tsx                    -> redirect p/ /dashboard ou /login
  login.tsx
  signup.tsx
  pending-approval.tsx
  _authenticated.tsx           -> guarda + layout com sidebar
  _authenticated/
    dashboard.tsx
    pacientes.tsx
    pacientes.$id.tsx
    solicitacoes.tsx
    solicitacoes.$id.tsx
    testes.tsx
    testes.$id.tsx
    estoque.tsx
    transfusoes.tsx
    transfusoes.$id.tsx
    reacoes.tsx
    relatorios.tsx
    usuarios.tsx
```
