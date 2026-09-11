# Controle de Produção — Casa do Bolinho de Frango

Aplicação web mobile-first para:
- login por funcionário;
- criação de ordens de produção;
- registro da quantidade realmente produzida;
- empacotamento com regra de 100 unidades por pacote;
- comparação entre programado, produzido e empacotado;
- histórico.

## Configuração

Crie um arquivo `.env.local`:

NEXT_PUBLIC_SUPABASE_URL=SEU_PROJECT_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_PUBLISHABLE_KEY

Nunca coloque a Secret key/service_role no navegador.

## Rodar

npm install
npm run dev

Depois abra http://localhost:3000
