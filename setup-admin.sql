-- ===============================================
-- CONFIGURAÇÃO RÁPIDA DO ADMINISTRADOR
-- ===============================================

-- 1. Configurar foolype@gmail.com como admin
INSERT INTO user_permissions (user_id, is_admin, allowed_pracas)
SELECT id, TRUE, ARRAY['Guarulhos', 'São Paulo', 'Campinas', 'Santos']
FROM auth.users WHERE email = 'foolype@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET is_admin = TRUE, allowed_pracas = ARRAY['Guarulhos', 'São Paulo', 'Campinas', 'Santos'];

-- 2. Verificar se foi configurado corretamente
SELECT u.email, p.is_admin, p.allowed_pracas
FROM auth.users u
LEFT JOIN user_permissions p ON u.id = p.user_id
WHERE u.email = 'foolype@gmail.com';

-- 3. Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE '✅ Administrador configurado com sucesso!';
    RAISE NOTICE '📧 Email: foolype@gmail.com';
    RAISE NOTICE '👑 Status: Administrador';
    RAISE NOTICE '📍 Praças permitidas: Guarulhos, São Paulo, Campinas, Santos';
END $$;
