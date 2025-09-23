# 👥 Guia para Adicionar Usuários ao Sistema

## 📋 Como Adicionar Contas para Outras Pessoas

### 🚀 **Método 1: Cadastro Automático (Recomendado)**

#### **Passo 1: Compartilhar Link de Cadastro**
1. **Compartilhe o link** do seu sistema com as pessoas que você quer adicionar
2. **Elas acessam** o link e clicam em "Criar conta" ou "Registrar"
3. **Preenchem os dados** (email, senha, etc.)
4. **Confirmam o email** (se configurado)

#### **Passo 2: Configurar Permissões (Como Admin)**
1. **Faça login** como administrador
2. **Clique no botão "Abrir Painel Admin"** (👑)
3. **Na seção "Gerenciar Usuários"**:
   - Clique no ícone ✏️ (Editar) ao lado do usuário
   - **Marque "Admin"** se quiser dar acesso total
   - **Selecione as cidades** que o usuário pode ver
   - Clique em ✅ (Salvar)

### 🔧 **Método 2: Criação Manual via Supabase**

#### **Passo 1: Acessar Supabase Dashboard**
1. Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **Selecione seu projeto**
3. Vá em **Authentication > Users**

#### **Passo 2: Criar Usuário**
1. **Clique em "Add user"**
2. **Preencha os dados**:
   - Email: `usuario@empresa.com`
   - Senha: `senha123` (temporária)
   - Confirme a senha
3. **Clique em "Create user"**

#### **Passo 3: Configurar Permissões**
Execute este SQL no **SQL Editor** do Supabase:

```sql
-- Substitua 'usuario@empresa.com' pelo email do usuário
INSERT INTO user_permissions (user_id, is_admin, allowed_pracas) 
SELECT 
    id, 
    FALSE,  -- FALSE = usuário normal, TRUE = admin
    ARRAY['Guarulhos', 'São Paulo']  -- Cidades que pode acessar
FROM auth.users 
WHERE email = 'usuario@empresa.com'
ON CONFLICT (user_id) DO UPDATE SET
    is_admin = FALSE,
    allowed_pracas = ARRAY['Guarulhos', 'São Paulo'];
```

### 🎯 **Tipos de Usuários**

#### **👑 Administrador (Admin)**
- **Acesso total** a todos os dados
- **Pode gerenciar** outros usuários
- **Pode importar** dados
- **Pode ver** painel administrativo

```sql
-- Tornar usuário admin
UPDATE user_permissions 
SET is_admin = TRUE, 
    allowed_pracas = ARRAY['Todas']
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@empresa.com');
```

#### **👤 Usuário Normal**
- **Acesso limitado** às cidades permitidas
- **Não pode** gerenciar outros usuários
- **Não pode** importar dados
- **Pode ver** apenas dashboard com seus dados

```sql
-- Usuário que só vê Guarulhos
UPDATE user_permissions 
SET is_admin = FALSE, 
    allowed_pracas = ARRAY['Guarulhos']
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'usuario@empresa.com');
```

### 🏙️ **Configuração de Cidades por Usuário**

#### **Exemplo 1: Usuário Regional**
```sql
-- Usuário que vê apenas São Paulo
UPDATE user_permissions 
SET allowed_pracas = ARRAY['São Paulo']
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sp@empresa.com');
```

#### **Exemplo 2: Usuário Multi-Regional**
```sql
-- Usuário que vê múltiplas cidades
UPDATE user_permissions 
SET allowed_pracas = ARRAY['São Paulo', 'Guarulhos', 'Campinas']
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'gerente@empresa.com');
```

#### **Exemplo 3: Usuário com Acesso Total**
```sql
-- Usuário que vê todas as cidades (mas não é admin)
UPDATE user_permissions 
SET allowed_pracas = ARRAY['Todas']
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'supervisor@empresa.com');
```

### 🔐 **Configurações de Segurança**

#### **Resetar Senha de Usuário**
1. **Supabase Dashboard** > Authentication > Users
2. **Encontre o usuário**
3. **Clique em "..."** > "Reset password"
4. **Envie o link** de reset para o usuário

#### **Desativar Usuário**
```sql
-- Desativar usuário (manter dados, mas bloquear acesso)
UPDATE auth.users 
SET email_confirmed_at = NULL 
WHERE email = 'usuario@empresa.com';
```

#### **Remover Usuário Completamente**
```sql
-- CUIDADO: Isso remove o usuário e suas permissões
DELETE FROM user_permissions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'usuario@empresa.com');

DELETE FROM auth.users 
WHERE email = 'usuario@empresa.com';
```

### 📊 **Verificar Usuários e Permissões**

#### **Listar Todos os Usuários**
```sql
SELECT 
    u.email,
    u.created_at,
    p.is_admin,
    p.allowed_pracas,
    p.created_at as permission_created
FROM auth.users u
LEFT JOIN user_permissions p ON u.id = p.user_id
ORDER BY u.created_at DESC;
```

#### **Verificar Usuários sem Permissões**
```sql
SELECT 
    u.email,
    u.created_at
FROM auth.users u
LEFT JOIN user_permissions p ON u.id = p.user_id
WHERE p.user_id IS NULL;
```

### 🚀 **Fluxo Completo de Adição de Usuário**

#### **1. Usuário se Cadastra**
- Acessa o link do sistema
- Cria conta com email e senha
- Confirma email (se necessário)

#### **2. Admin Configura Permissões**
- Admin faz login
- Abre painel administrativo
- Encontra o novo usuário na lista
- Configura cidades permitidas
- Salva as configurações

#### **3. Usuário Acessa Sistema**
- Faz login com suas credenciais
- Vê apenas os dados das cidades permitidas
- Dashboard mostra métricas filtradas

### ⚠️ **Dicas Importantes**

1. **Sempre configure permissões** após criar usuário
2. **Use cidades específicas** para controle granular
3. **Admins têm acesso total** automaticamente
4. **Teste as permissões** antes de liberar acesso
5. **Mantenha backup** das configurações importantes

### 🆘 **Problemas Comuns**

#### **Usuário não consegue fazer login**
- Verificar se email está correto
- Verificar se conta foi confirmada
- Resetar senha se necessário

#### **Usuário não vê dados**
- Verificar se tem permissões configuradas
- Verificar se as cidades estão corretas
- Verificar se há dados nas cidades permitidas

#### **Usuário vê dados de outras cidades**
- Verificar configuração de `allowed_pracas`
- Verificar se não é admin acidentalmente
- Revisar permissões no painel admin

---

**🎉 Agora você sabe como adicionar e gerenciar usuários no sistema!**
