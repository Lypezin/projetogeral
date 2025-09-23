# Dashboard Empresarial

Sistema robusto de importação e análise de dados de entregadores com interface moderna e funcionalidades avançadas.

## 🚀 Funcionalidades

- **Importação Robusta**: Sistema de importação em lotes para arquivos Excel com mais de 1 milhão de linhas
- **Dashboard Interativo**: Visualização de métricas principais com gráficos
- **Interface Moderna**: Design limpo e responsivo com tons de azul
- **Processamento Rápido**: Otimizado para não extrapolar limites do Supabase

## 📊 Métricas Disponíveis

- Corridas Ofertadas
- Corridas Aceitas
- Corridas Rejeitadas
- Corridas Completadas
- Taxas de Aceitação, Rejeição e Complementação

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Charts**: Recharts
- **File Processing**: SheetJS (xlsx)
- **UI Components**: Lucide React, React Hot Toast

## ⚙️ Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dggswtzjozluleqlckdg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZ3N3dHpqb3psdWxlcWxja2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NzMzMjMsImV4cCI6MjA3NDE0OTMyM30.tSo7qK713vy5z5Kz1RFq61TlLK3Zj1Pqoz-RpRCE4q4
```

### 3. Executar em Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📋 Estrutura do Excel

O sistema espera as seguintes colunas no arquivo Excel:

- `data_do_periodo`
- `periodo`
- `duracao_do_periodo` (formato HH:MM:SS)
- `numero_minimo_de_entregadores_regulares_na_escala`
- `tag`
- `id_da_pessoa_entregadora`
- `pessoa_entregadora`
- `praca`
- `sub_praca`
- `origem`
- `tempo_disponivel_escalado`
- `tempo_disponivel_absoluto` (formato HH:MM:SS)
- `numero_de_corridas_ofertadas`
- `numero_de_corridas_aceitas`
- `numero_de_corridas_rejeitadas`
- `numero_de_corridas_completadas`
- `numero_de_corridas_canceladas_pela_pessoa_entregadora`
- `numero_de_pedidos_aceitos_e_concluidos`
- `soma_das_taxas_das_corridas_aceitas`

## 🔧 Funcionalidades Técnicas

### Sistema de Importação

- **Processamento em Lotes**: Importa dados em grupos de 1000 registros
- **Validação de Dados**: Verifica e converte tipos de dados automaticamente
- **Tratamento de Tempo**: Converte formatos de tempo Excel para HH:MM:SS
- **Feedback em Tempo Real**: Barra de progresso e estatísticas de importação
- **Gestão de Erros**: Relatório detalhado de erros e sucessos

### Performance

- **Otimização de Batch**: Evita sobrecarregar o Supabase
- **Interface Responsiva**: Carregamento assíncrono e feedback visual
- **Gestão de Memória**: Processamento eficiente de arquivos grandes

## 📱 Interface

- **Design Responsivo**: Funciona em desktop, tablet e mobile
- **Tema Azul**: Paleta de cores consistente e profissional
- **Componentes Interativos**: Drag & drop, gráficos interativos
- **Notificações**: Sistema de toast para feedback do usuário

## 🚀 Deploy

### Build de Produção

```bash
npm run build
npm start
```

### Variáveis de Ambiente de Produção

Certifique-se de configurar as variáveis de ambiente no seu provedor de hosting.

## 📈 Monitoramento

O sistema inclui:

- Logs de importação detalhados
- Métricas de performance
- Relatórios de erro
- Estatísticas em tempo real

## 🤝 Suporte

Para suporte ou dúvidas sobre o sistema, consulte a documentação técnica ou entre em contato com a equipe de desenvolvimento.
