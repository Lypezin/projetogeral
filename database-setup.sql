-- ===============================================
-- SCRIPT DE CONFIGURAÇÃO DO BANCO DE DADOS
-- Dashboard Empresarial - Sistema de Autenticação e Permissões
-- ===============================================

-- CONFIGURAÇÃO RÁPIDA PARA TESTE
-- Execute este comando primeiro para configurar foolype@gmail.com como admin:
-- INSERT INTO user_permissions (user_id, is_admin, allowed_pracas)
-- SELECT id, TRUE, ARRAY['Guarulhos', 'São Paulo', 'Campinas', 'Santos']
-- FROM auth.users WHERE email = 'foolype@gmail.com'
-- ON CONFLICT (user_id) DO UPDATE SET is_admin = TRUE, allowed_pracas = ARRAY['Guarulhos', 'São Paulo', 'Campinas', 'Santos'];

-- 1. TABELA DE PERMISSÕES DE USUÁRIO
-- Esta tabela armazena as permissões de cada usuário
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allowed_pracas TEXT[] DEFAULT '{}', -- Array de praças que o usuário pode acessar
  is_admin BOOLEAN DEFAULT FALSE,      -- Se o usuário é administrador
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Garantir que cada usuário tenha apenas um registro de permissão
  UNIQUE(user_id)
);

-- 2. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_is_admin ON user_permissions(is_admin);

-- 3. RLS (Row Level Security) - Segurança a nível de linha
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver suas próprias permissões
CREATE POLICY "Users can view own permissions" ON user_permissions
  FOR SELECT USING (auth.uid() = user_id);

-- Política: Apenas admins podem modificar permissões
CREATE POLICY "Only admins can modify permissions" ON user_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Política adicional: Permitir que usuários sem permissões definidas as criem
CREATE POLICY "Users can insert own permissions" ON user_permissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política adicional: Permitir que usuários atualizem suas próprias permissões
CREATE POLICY "Users can update own permissions" ON user_permissions
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. FUNÇÕES RPC PARA CONSULTAS OTIMIZADAS
-- Estas funções permitem consultar dados com alta performance mesmo com +1M registros

-- 4.1 Função para obter estatísticas gerais (dashboard principal)
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  user_id_param UUID DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  sub_pracas TEXT[] DEFAULT NULL,
  origens TEXT[] DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  user_pracas TEXT[];
  is_user_admin BOOLEAN;
  result JSON;
BEGIN
  -- Verificar permissões do usuário
  IF user_id_param IS NOT NULL THEN
    SELECT allowed_pracas, is_admin 
    INTO user_pracas, is_user_admin
    FROM user_permissions 
    WHERE user_id = user_id_param;
  ELSE
    -- Se não especificado, usar o usuário atual
    SELECT allowed_pracas, is_admin 
    INTO user_pracas, is_user_admin
    FROM user_permissions 
    WHERE user_id = auth.uid();
  END IF;

  -- Se não é admin e não tem permissões específicas, retornar vazio
  IF NOT COALESCE(is_user_admin, FALSE) AND (user_pracas IS NULL OR array_length(user_pracas, 1) = 0) THEN
    RETURN '{"error": "Acesso negado"}';
  END IF;

  -- Construir query com base nas permissões
  WITH filtered_data AS (
    SELECT *
    FROM delivery_data
    WHERE 
      -- Filtro de data
      (start_date IS NULL OR data_do_periodo::DATE >= start_date) AND
      (end_date IS NULL OR data_do_periodo::DATE <= end_date) AND
      -- Filtro de sub-praças
      (sub_pracas IS NULL OR array_length(sub_pracas, 1) = 0 OR sub_praca = ANY(sub_pracas)) AND
      -- Filtro de origens
      (origens IS NULL OR array_length(origens, 1) = 0 OR origem = ANY(origens)) AND
      -- Filtro de permissões
      (
        COALESCE(is_user_admin, FALSE) = TRUE OR 
        (user_pracas IS NOT NULL AND praca = ANY(user_pracas))
      )
  )
  SELECT json_build_object(
    'total_records', COUNT(*),
    'total_ofertadas', SUM(numero_de_corridas_ofertadas),
    'total_aceitas', SUM(numero_de_corridas_aceitas),
    'total_rejeitadas', SUM(numero_de_corridas_rejeitadas),
    'total_completadas', SUM(numero_de_corridas_completadas),
    'total_canceladas', SUM(numero_de_corridas_canceladas_pela_pessoa_entregadora),
    'total_pedidos_concluidos', SUM(numero_de_pedidos_aceitos_e_concluidos),
    'total_taxas', SUM(soma_das_taxas_das_corridas_aceitas),
    'data_range', json_build_object(
      'start_date', MIN(data_do_periodo::DATE),
      'end_date', MAX(data_do_periodo::DATE)
    ),
    'pracas_disponiveis', (
      SELECT array_agg(DISTINCT praca)
      FROM filtered_data
      WHERE praca IS NOT NULL AND praca != ''
    )
  )
  INTO result
  FROM filtered_data;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 Função para obter dados por praça (gráficos)
CREATE OR REPLACE FUNCTION get_data_by_praca(
  user_id_param UUID DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  sub_pracas TEXT[] DEFAULT NULL,
  origens TEXT[] DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  user_pracas TEXT[];
  is_user_admin BOOLEAN;
  result JSON;
BEGIN
  -- Verificar permissões do usuário
  IF user_id_param IS NOT NULL THEN
    SELECT allowed_pracas, is_admin 
    INTO user_pracas, is_user_admin
    FROM user_permissions 
    WHERE user_id = user_id_param;
  ELSE
    SELECT allowed_pracas, is_admin 
    INTO user_pracas, is_user_admin
    FROM user_permissions 
    WHERE user_id = auth.uid();
  END IF;

  -- Se não é admin e não tem permissões específicas, retornar vazio
  IF NOT COALESCE(is_user_admin, FALSE) AND (user_pracas IS NULL OR array_length(user_pracas, 1) = 0) THEN
    RETURN '{"error": "Acesso negado"}';
  END IF;

  -- Obter dados agrupados por praça
  WITH filtered_data AS (
    SELECT *
    FROM delivery_data
    WHERE 
      (start_date IS NULL OR data_do_periodo::DATE >= start_date) AND
      (end_date IS NULL OR data_do_periodo::DATE <= end_date) AND
      (sub_pracas IS NULL OR array_length(sub_pracas, 1) = 0 OR sub_praca = ANY(sub_pracas)) AND
      (origens IS NULL OR array_length(origens, 1) = 0 OR origem = ANY(origens)) AND
      (
        COALESCE(is_user_admin, FALSE) = TRUE OR 
        (user_pracas IS NOT NULL AND praca = ANY(user_pracas))
      )
  )
  SELECT json_agg(
    json_build_object(
      'praca', praca,
      'ofertadas', total_ofertadas,
      'aceitas', total_aceitas,
      'rejeitadas', total_rejeitadas,
      'completadas', total_completadas
    )
  )
  INTO result
  FROM (
    SELECT 
      praca,
      SUM(numero_de_corridas_ofertadas) as total_ofertadas,
      SUM(numero_de_corridas_aceitas) as total_aceitas,
      SUM(numero_de_corridas_rejeitadas) as total_rejeitadas,
      SUM(numero_de_corridas_completadas) as total_completadas
    FROM filtered_data
    WHERE praca IS NOT NULL AND praca != ''
    GROUP BY praca
    ORDER BY total_ofertadas DESC
  ) grouped_data;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Função para obter dados por período (timeline)
CREATE OR REPLACE FUNCTION get_data_by_period(
  user_id_param UUID DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  user_pracas TEXT[];
  is_user_admin BOOLEAN;
  result JSON;
BEGIN
  -- Verificar permissões do usuário
  IF user_id_param IS NOT NULL THEN
    SELECT allowed_pracas, is_admin 
    INTO user_pracas, is_user_admin
    FROM user_permissions 
    WHERE user_id = user_id_param;
  ELSE
    SELECT allowed_pracas, is_admin 
    INTO user_pracas, is_user_admin
    FROM user_permissions 
    WHERE user_id = auth.uid();
  END IF;

  -- Se não é admin e não tem permissões específicas, retornar vazio
  IF NOT COALESCE(is_user_admin, FALSE) AND (user_pracas IS NULL OR array_length(user_pracas, 1) = 0) THEN
    RETURN '{"error": "Acesso negado"}';
  END IF;

  -- Obter dados agrupados por data
  WITH filtered_data AS (
    SELECT *
    FROM delivery_data
    WHERE 
      (start_date IS NULL OR data_do_periodo::DATE >= start_date) AND
      (end_date IS NULL OR data_do_periodo::DATE <= end_date) AND
      (
        COALESCE(is_user_admin, FALSE) = TRUE OR 
        (user_pracas IS NOT NULL AND praca = ANY(user_pracas))
      )
  )
  SELECT json_agg(
    json_build_object(
      'data', data_periodo,
      'ofertadas', total_ofertadas,
      'aceitas', total_aceitas,
      'rejeitadas', total_rejeitadas,
      'completadas', total_completadas
    ) ORDER BY data_periodo
  )
  INTO result
  FROM (
    SELECT 
      data_do_periodo::DATE as data_periodo,
      SUM(numero_de_corridas_ofertadas) as total_ofertadas,
      SUM(numero_de_corridas_aceitas) as total_aceitas,
      SUM(numero_de_corridas_rejeitadas) as total_rejeitadas,
      SUM(numero_de_corridas_completadas) as total_completadas
    FROM filtered_data
    GROUP BY data_do_periodo::DATE
    ORDER BY data_do_periodo::DATE
  ) grouped_data;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGER PARA ATUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_permissions_updated_at
    BEFORE UPDATE ON user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. DADOS INICIAIS (EXEMPLO)
-- Criar um usuário admin inicial (substitua o UUID pelo ID do seu usuário)
-- INSERT INTO user_permissions (user_id, is_admin) 
-- VALUES ('SEU_USER_ID_AQUI', TRUE)
-- ON CONFLICT (user_id) DO UPDATE SET is_admin = TRUE;

-- 7. COMENTÁRIOS E DOCUMENTAÇÃO
COMMENT ON TABLE user_permissions IS 'Armazena permissões de acesso por usuário';
COMMENT ON COLUMN user_permissions.allowed_pracas IS 'Array de praças que o usuário pode visualizar';
COMMENT ON COLUMN user_permissions.is_admin IS 'Se TRUE, usuário tem acesso completo ao sistema';

COMMENT ON FUNCTION get_dashboard_stats IS 'Retorna estatísticas gerais do dashboard respeitando permissões do usuário';
COMMENT ON FUNCTION get_data_by_praca IS 'Retorna dados agrupados por praça respeitando permissões do usuário';
COMMENT ON FUNCTION get_data_by_period IS 'Retorna dados agrupados por período respeitando permissões do usuário';
