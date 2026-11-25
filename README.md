# TaskFlow

Gerenciador de tarefas para equipes, construído como um **SaaS multi-tenant** para portfólio.

Cada cliente cria uma **organização** (o *tenant*), convida membros e organiza projetos e tarefas. Os dados de uma organização nunca são visíveis para outra.

## Funcionalidades

- [x] Cadastro e login (e-mail e senha)
- [x] Criação de organização (o criador vira admin)
- [x] Isolamento de dados por organização (Row Level Security)
- [x] Limite do plano Free (2 projetos) aplicado no banco
- [x] Projetos por organização, com aviso de limite do plano Free
- [x] Quadro de tarefas (a fazer, fazendo, feito): criar, mover e apagar
- [x] Nome de organização único (índice no banco, sem diferenciar maiúsculas)
- [ ] Convite de membros e papéis (admin/membro)
- [ ] Tela de upgrade Free → Pro (simulada ou Stripe em modo de teste)
- [ ] Deploy com conta de demonstração

## Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend e banco:** Supabase (PostgreSQL + Auth)
- **Deploy:** Vercel + Supabase

## Arquitetura multi-tenant

Estratégia: **banco compartilhado, isolamento por linha**.

```
User ──< Membership >── Organization ──< Project ──< Task
         (role)           (plan)
```

- Toda tabela de negócio (`projects`, `tasks`) carrega `organization_id`.
- O isolamento não depende do código do frontend: ele é garantido no banco com **Row Level Security**. As políticas usam a função `is_member(organization_id)`, que checa se o usuário logado (`auth.uid()`) pertence à organização.
- Permissões por papel: qualquer membro cria e edita; só admin apaga projetos e gerencia a equipe.
- Regras de plano (limite de projetos do Free) ficam em um *trigger* do banco, então não dá para burlá-las pela API.

### Por que RLS em vez de filtrar na aplicação?

Filtrar com `where organization_id = ...` no código funciona, mas basta um esquecimento para vazar dados entre clientes. Com RLS, o banco recusa a consulta por padrão, e a segurança passa a ser uma propriedade do sistema, não de cada query.

## Como rodar localmente

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute o conteúdo de `supabase/schema.sql`.
3. Copie `.env.example` para `.env.local` e preencha a URL e a chave `anon` (Project Settings > API).
4. Instale e rode:

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

> Em desenvolvimento, desative "Confirm email" em Supabase > Authentication > Providers > Email para testar o cadastro sem precisar confirmar o e-mail.

## Estrutura

```
supabase/schema.sql        Tabelas, RLS, triggers e funções
src/middleware.ts          Renova a sessão e protege /dashboard
src/lib/supabase/          Clientes do Supabase (navegador e servidor)
src/app/page.tsx           Landing page com planos
src/app/login/             Login e cadastro
src/app/dashboard/         Painel: lista e cria organizações
src/app/org/[id]/          Página da organização: lista e cria projetos
src/app/org/[id]/projects/[projectId]/   Quadro de tarefas do projeto
src/components/            Componentes compartilhados
```

## Próximos passos

1. Convite de membros e papéis (admin/membro), com apagar e renomear projetos só para admin
2. Responsável por tarefa (assignee)
3. Upgrade de plano com Stripe (modo de teste)
4. Deploy com conta de demonstração
