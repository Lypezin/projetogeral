# 🔑 Guia de Configuração de Permissões

## Como configurar quais regiões cada usuário pode ver?

### 📋 **Passo 1: Executar o SQL no Supabase**

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Cole e execute o conteúdo do arquivo `database-setup.sql`

### 👥 **Passo 2: Primeiro usuário (você) virar admin**

1. Faça login no sistema uma vez
2. No Supabase, vá em **SQL Editor** e execute:

```sql
-- Substitua 'SEU_EMAIL@EXEMPLO.COM' pelo seu email
INSERT INTO user_permissions (user_id, is_admin) 
SELECT id, TRUE 
FROM auth.users 
WHERE email = 'SEU_EMAIL@EXEMPLO.COM'
ON CONFLICT (user_id) DO UPDATE SET is_admin = TRUE;
```

### 🏢 **Passo 3: Configurar outros usuários**

#### **Opção A: Pelo Painel Admin (Recomendado)**
1. Faça login como admin
2. O **Painel Administrativo** aparecerá automaticamente
3. Para cada usuário:
   - Clique no ícone ✏️ (Editar)
   - **Admin**: Marque se quiser acesso total
   - **Praças**: Selecione quais praças o usuário pode ver
   - Clique em ✅ (Salvar)

#### **Opção B: Via SQL Manual**
```sql
-- Usuário que só vê dados de Guarulhos
INSERT INTO user_permissions (user_id, allowed_pracas, is_admin) 
SELECT id, ARRAY['Guarulhos'], FALSE 
FROM auth.users 
WHERE email = 'usuario@empresa.com'
ON CONFLICT (user_id) DO UPDATE SET 
  allowed_pracas = ARRAY['Guarulhos'], 
  is_admin = FALSE;

-- Usuário que vê múltiplas regiões
INSERT INTO user_permissions (user_id, allowed_pracas, is_admin) 
SELECT id, ARRAY['São Paulo', 'Rio de Janeiro', 'Belo Horizonte'], FALSE 
FROM auth.users 
WHERE email = 'gerente@empresa.com'
ON CONFLICT (user_id) DO UPDATE SET 
  allowed_pracas = ARRAY['São Paulo', 'Rio de Janeiro', 'Belo Horizonte'], 
  is_admin = FALSE;
```

### 🎯 **Tipos de Permissão**

| Tipo | Acesso | Como Configurar |
|------|--------|----------------|
| **Admin** | Vê todos os dados + gerencia usuários | `is_admin = TRUE` |
| **Regional** | Vê apenas praças específicas | `allowed_pracas = ARRAY['Praça1', 'Praça2']` |
| **Sem Acesso** | Não consegue ver dashboard | Não ter registro na tabela |

### 🔍 **Verificar Configurações**

```sql
-- Ver todos os usuários e suas permissões
SELECT 
  u.email,
  p.is_admin,
  p.allowed_pracas,
  array_length(p.allowed_pracas, 1) as num_pracas
FROM auth.users u
LEFT JOIN user_permissions p ON u.id = p.user_id
ORDER BY u.created_at;
```

### ⚠️ **Importante**

- **Usuários sem permissões** não conseguem acessar o dashboard
- **Admins** veem tudo e podem gerenciar outros usuários
- **Praças** são baseadas no campo `praca` da tabela `delivery_data`
- **Mudanças** são aplicadas imediatamente (sem necessidade de logout)

### 🚀 **Fluxo Típico**

1. **Novo funcionário** faz login → não vê nada
2. **Admin** acessa painel → configura permissões
3. **Funcionário** recarrega página → vê apenas sua região
4. **Sistema filtra automaticamente** todos os dados e gráficos
