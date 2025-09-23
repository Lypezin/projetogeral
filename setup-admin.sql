-- ===============================================
-- CONFIGURAÇÃO COMPLETA DO ADMINISTRADOR
-- ===============================================

-- 1. Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_permissions'
) AS table_exists;

-- 2. Verificar se o usuário existe
SELECT id, email, created_at
FROM auth.users
WHERE email = 'foolype@gmail.com';

-- 3. Configurar foolype@gmail.com como admin (com tratamento de erro)
DO $$
DECLARE
    user_id UUID;
    user_count INTEGER;
BEGIN
    -- Verificar se o usuário existe
    SELECT COUNT(*) INTO user_count FROM auth.users WHERE email = 'foolype@gmail.com';

    IF user_count = 0 THEN
        RAISE EXCEPTION 'Usuário foolype@gmail.com não encontrado no auth.users';
    END IF;

    -- Obter o ID do usuário
    SELECT id INTO user_id FROM auth.users WHERE email = 'foolype@gmail.com';

    -- Inserir ou atualizar permissões
    INSERT INTO user_permissions (user_id, is_admin, allowed_pracas, created_at, updated_at)
    VALUES (
        user_id,
        TRUE,
        ARRAY['Guarulhos', 'São Paulo', 'Campinas', 'Santos'],
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        is_admin = TRUE,
        allowed_pracas = ARRAY['Guarulhos', 'São Paulo', 'Campinas', 'Santos'],
        updated_at = NOW();

    RAISE NOTICE '✅ Permissões configuradas com sucesso para foolype@gmail.com';
    RAISE NOTICE '👑 Status: Administrador';
    RAISE NOTICE '📍 Praças permitidas: Guarulhos, São Paulo, Campinas, Santos';
END $$;

-- 4. Verificar se foi configurado corretamente
SELECT
    u.email,
    u.id as user_id,
    p.is_admin,
    p.allowed_pracas,
    p.created_at,
    p.updated_at
FROM auth.users u
LEFT JOIN user_permissions p ON u.id = p.user_id
WHERE u.email = 'foolype@gmail.com';

-- 5. Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_permissions';

-- 6. Testar query que está falhando
DO $$
DECLARE
    test_user_id UUID;
    test_result RECORD;
BEGIN
    -- Obter o ID do usuário
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'foolype@gmail.com';

    -- Tentar a query que está falhando no frontend
    SELECT * INTO test_result
    FROM user_permissions
    WHERE user_id = test_user_id;

    RAISE NOTICE '✅ Query testada com sucesso: %', test_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Erro na query de teste: %', SQLERRM;
END $$;

-- 7. Mensagem de confirmação final
DO $$
BEGIN
    RAISE NOTICE '🎉 Configuração completa finalizada!';
    RAISE NOTICE '🔄 Recarregue a página (F5) para ver as mudanças';
    RAISE NOTICE '👀 Verifique o console do navegador para logs de debug';
END $$;
