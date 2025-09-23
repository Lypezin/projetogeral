-- ===============================================
-- SCRIPT SIMPLES PARA CONFIGURAR ADMIN
-- ===============================================

-- 1. Verificar se o usuário existe
SELECT id, email FROM auth.users WHERE email = 'foolype@gmail.com';

-- 2. Configurar permissões de admin (comando simples)
INSERT INTO user_permissions (user_id, is_admin, allowed_pracas)
SELECT 
    id, 
    TRUE, 
    ARRAY['Guarulhos', 'São Paulo', 'Campinas', 'Santos']
FROM auth.users 
WHERE email = 'foolype@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
    is_admin = TRUE,
    allowed_pracas = ARRAY['Guarulhos', 'São Paulo', 'Campinas', 'Santos'],
    updated_at = NOW();

-- 3. Verificar se foi configurado
SELECT 
    u.email,
    p.is_admin,
    p.allowed_pracas
FROM auth.users u
LEFT JOIN user_permissions p ON u.id = p.user_id
WHERE u.email = 'foolype@gmail.com';

-- 4. Testar a query que o frontend usa
SELECT * FROM user_permissions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'foolype@gmail.com');
