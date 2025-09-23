-- ===============================================
-- SCRIPT DE DEBUG COMPLETO DO SUPABASE
-- ===============================================

-- 1. Verificar se o usuário existe
SELECT 
    'Usuário encontrado' as status,
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'foolype@gmail.com';

-- 2. Verificar se a tabela user_permissions existe
SELECT 
    'Tabela user_permissions' as status,
    EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_permissions'
    ) as table_exists;

-- 3. Verificar permissões atuais
SELECT 
    'Permissões atuais' as status,
    u.email,
    p.user_id,
    p.is_admin,
    p.allowed_pracas,
    p.created_at,
    p.updated_at
FROM auth.users u
LEFT JOIN user_permissions p ON u.id = p.user_id
WHERE u.email = 'foolype@gmail.com';

-- 4. Verificar políticas RLS
SELECT 
    'Políticas RLS' as status,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'user_permissions';

-- 5. Testar query que está falhando (simular o que o frontend faz)
DO $$
DECLARE
    test_user_id UUID;
    test_result RECORD;
    error_message TEXT;
BEGIN
    -- Obter o ID do usuário
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'foolype@gmail.com';
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário foolype@gmail.com não encontrado';
    END IF;
    
    RAISE NOTICE 'Testando query para user_id: %', test_user_id;
    
    -- Tentar a query exata que o frontend faz
    BEGIN
        SELECT * INTO test_result
        FROM user_permissions
        WHERE user_id = test_user_id;
        
        RAISE NOTICE '✅ Query executada com sucesso!';
        RAISE NOTICE 'Resultado: %', test_result;
        
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
            RAISE NOTICE '❌ Erro na query: %', error_message;
            RAISE;
    END;
END $$;

-- 6. Criar/atualizar permissões se necessário
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
    SELECT EXISTS(
        SELECT 1 FROM user_permissions WHERE user_id = target_user_id
    ) INTO permission_exists;
    
    IF permission_exists THEN
        -- Atualizar permissão existente
        UPDATE user_permissions 
        SET 
            is_admin = TRUE,
            allowed_pracas = ARRAY['Guarulhos', 'São Paulo', 'Campinas', 'Santos'],
            updated_at = NOW()
        WHERE user_id = target_user_id;
        
        RAISE NOTICE '✅ Permissão atualizada para user_id: %', target_user_id;
    ELSE
        -- Criar nova permissão
        INSERT INTO user_permissions (user_id, is_admin, allowed_pracas, created_at, updated_at)
        VALUES (
            target_user_id,
            TRUE,
            ARRAY['Guarulhos', 'São Paulo', 'Campinas', 'Santos'],
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Nova permissão criada para user_id: %', target_user_id;
    END IF;
END $$;

-- 7. Verificar resultado final
SELECT 
    'Resultado final' as status,
    u.email,
    p.user_id,
    p.is_admin,
    p.allowed_pracas,
    p.created_at,
    p.updated_at
FROM auth.users u
LEFT JOIN user_permissions p ON u.id = p.user_id
WHERE u.email = 'foolype@gmail.com';

-- 8. Testar query final
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
END $$;

-- 9. Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE '🎉 DEBUG COMPLETO FINALIZADO!';
    RAISE NOTICE '🔄 Recarregue a página (F5) para ver as mudanças';
    RAISE NOTICE '👀 Verifique o console do navegador para logs detalhados';
    RAISE NOTICE '📧 Email: foolype@gmail.com';
    RAISE NOTICE '👑 Status: Administrador configurado';
END $$;
