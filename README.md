This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Norm8 Admin: Supabase e autenticação local

A Área Interna em `/admin` usa autenticação server-side com utilizadores administrativos, sessões em base de dados e logs em `AdminAuthLog`. O login não funciona se a base de dados estiver inacessível — isto é intencional e seguro.

### 1. Configurar Supabase

No ambiente local, configura as URLs no `.env` com os valores copiados do Supabase Dashboard. Não commitar secrets reais.

Para runtime da aplicação, usa preferencialmente o Transaction Pooler do Supabase:

```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[POOLER_HOST]:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
```

Para migrations/CLI Prisma, usa a ligação direta quando disponível:

```env
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"
```

Notas:

- Se a password tiver `@`, `#`, `%`, `/`, `:`, `?` ou `&`, confirma que está URL-encoded.
- Se o host direto `db.[PROJECT_REF].supabase.co` falhar localmente por DNS/IPv6/rede, usa o pooler em `DATABASE_URL`.
- Depois de alterar `.env`, reinicia o servidor Next.js.

### 2. Diagnosticar ligação à base de dados

Executa:

```bash
npm run db:doctor
```

O comando mostra apenas URLs redigidas e testa:

- presença de `DATABASE_URL` e `DIRECT_URL`;
- DNS;
- ligação TCP;
- ligação PostgreSQL;
- contagem das tabelas `AdminUser`, `AdminAuthLog` e `AdminSession`.

O login Admin só deve ser testado depois de `npm run db:doctor` passar para `DATABASE_URL`.

### 3. Aplicar migrations e gerar client

```bash
npx prisma migrate deploy
npx prisma generate
```

Em desenvolvimento, se precisares de criar uma migration nova:

```bash
npx prisma migrate dev
```

### 4. Criar ou resetar o admin inicial

Depois da base de dados estar acessível:

```bash
npm run admin:create -- --email norm8.ai@gmail.com
```

O script pede a password no terminal e guarda apenas o hash. Também pode usar variáveis temporárias, sem as commitar:

```bash
INITIAL_ADMIN_EMAIL="norm8.ai@gmail.com" INITIAL_ADMIN_PASSWORD="..." npm run admin:create
```

### 5. Limpar cache local e arrancar

```bash
rmdir /s /q .next
npx prisma generate
npm run dev
```

Depois testa:

- `/admin/login?next=%2Fadmin`;
- login com `norm8.ai@gmail.com`;
- `/admin`, `/admin/leads`, `/admin/meetings`, `/admin/emails`.
