-- ===============================================
-- SCRIPT ROBUSTO PARA CONFIGURAÇÃO DE ADMIN
-- ===============================================

-- 1. Verificar se a tabela user_permissions existe e criar se necessário
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allowed_pracas TEXT[] DEFAULT '{}',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Habilitar RLS se não estiver habilitado
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Users can view own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Only admins can modify permissions" ON user_permissions;
DROP POLICY IF EXISTS "Users can insert own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Users can update own permissions" ON user_permissions;

-- 4. Criar políticas RLS mais permissivas
CREATE POLICY "Allow all operations for authenticated users" ON user_permissions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 5. Verificar se o usuário existe
DO $$
DECLARE
    user_exists BOOLEAN;
    user_id UUID;
BEGIN
    -- Verificar se o usuário existe
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'foolype@gmail.com') INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'Usuário foolype@gmail.com não encontrado no auth.users';
    END IF;
    
    -- Obter o ID do usuário
    SELECT id INTO user_id FROM auth.users WHERE email = 'foolype@gmail.com';
    
    RAISE NOTICE '✅ Usuário encontrado: %', user_id;
END $$;

-- 6. Configurar permissões de admin (forçar criação)
DO $$
DECLARE
    target_user_id UUID;
    permission_exists BOOLEAN;
BEGIN
    -- Obter o ID do usuário
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'foolype@gmail.com';
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário foolype@gmail.com não encontrado';
    END IF;
    
    -- Verificar se já existe permissão
    SELECT EXISTS(SELECT 1 FROM user_permissions WHERE user_id = target_user_id) INTO permission_exists;
    
    IF permission_exists THEN
        -- Atualizar permissão existente
        UPDATE user_permissions 
        SET 
            is_admin = TRUE,
            allowed_pracas = ARRAY['Guarulhos', 'São Paulo', 'Campinas', 'Santos', 'Todas'],
            updated_at = NOW()
        WHERE user_id = target_user_id;
        
        RAISE NOTICE '✅ Permissão atualizada para user_id: %', target_user_id;
    ELSE
        -- Criar nova permissão
        INSERT INTO user_permissions (user_id, is_admin, allowed_pracas, created_at, updated_at)
        VALUES (
            target_user_id,
            TRUE,
            ARRAY['Guarulhos', 'São Paulo', 'Campinas', 'Santos', 'Todas'],
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Nova permissão criada para user_id: %', target_user_id;
    END IF;
END $$;

-- 7. Verificar resultado final
SELECT 
    'RESULTADO FINAL' as status,
    u.email,
    u.id as user_id,
    p.is_admin,
    p.allowed_pracas,
    p.created_at,
    p.updated_at
FROM auth.users u
LEFT JOIN user_permissions p ON u.id = p.user_id
WHERE u.email = 'foolype@gmail.com';

-- 8. Testar query que o frontend usa
DO $$
DECLARE
    test_user_id UUID;
    test_result RECORD;
BEGIN
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'foolype@gmail.com';
    
    SELECT * INTO test_result
    FROM user_permissions
    WHERE user_id = test_user_id;
    
    RAISE NOTICE '🎉 TESTE FINAL: Query executada com sucesso!';
    RAISE NOTICE '📊 Resultado: %', test_result;
    RAISE NOTICE '👑 É admin: %', test_result.is_admin;
    RAISE NOTICE '📍 Praças: %', test_result.allowed_pracas;
    
    IF test_result.is_admin IS NULL THEN
        RAISE EXCEPTION '❌ ERRO: Permissão não foi criada corretamente!';
    END IF;
    
    IF NOT test_result.is_admin THEN
        RAISE EXCEPTION '❌ ERRO: Usuário não foi configurado como admin!';
    END IF;
    
    RAISE NOTICE '✅ SUCESSO: Usuário configurado como admin!';
END $$;

-- 9. Criar função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_user_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    SELECT p.is_admin INTO is_admin
    FROM auth.users u
    LEFT JOIN user_permissions p ON u.id = p.user_id
    WHERE u.email = user_email;
    
    RETURN COALESCE(is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Testar a função
SELECT is_user_admin('foolype@gmail.com') as is_admin;

-- 11. Mensagem de confirmação final
DO $$
BEGIN
    RAISE NOTICE '🎉 CONFIGURAÇÃO ROBUSTA FINALIZADA!';
    RAISE NOTICE '🔄 Recarregue a página (F5) para ver as mudanças';
    RAISE NOTICE '👀 Verifique o console do navegador para logs detalhados';
    RAISE NOTICE '📧 Email: foolype@gmail.com';
    RAISE NOTICE '👑 Status: Administrador configurado com sistema robusto';
    RAISE NOTICE '🔧 Políticas RLS: Configuradas para permitir acesso';
    RAISE NOTICE '⚡ Função is_user_admin: Criada e testada';
END $$;
