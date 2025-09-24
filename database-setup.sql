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
-- =============================================
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para verificar se o usuário é admin.
-- SECURITY DEFINER permite que a função execute com privilégios elevados,
-- evitando o problema de recursão infinita nas políticas RLS.
CREATE OR REPLACE FUNCTION public.is_claims_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- As políticas são DELETADAS e recriadas para garantir que a versão mais recente seja utilizada.
DROP POLICY IF EXISTS "Allow all access for admins" ON public.user_permissions;
CREATE POLICY "Allow all access for admins" ON public.user_permissions
  FOR ALL USING (public.is_claims_admin());

DROP POLICY IF EXISTS "Users can view and edit own permissions" ON public.user_permissions;
CREATE POLICY "Users can view and edit own permissions" ON public.user_permissions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 4. FUNÇÃO E TRIGGER PARA ATUALIZAR `updated_at`
-- =============================================
-- Esta função será chamada por um trigger sempre que uma linha for atualizada.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- O trigger é recriado para garantir que está usando a função mais recente.
DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON public.user_permissions;
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- FUNÇÕES RPC (Remote Procedure Call)
-- =============================================

-- As funções são DELETADAS e recriadas para garantir que a versão mais recente seja utilizada,
-- especialmente quando o tipo de retorno é alterado (de JSON para TABLE), o que causa erros com CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.get_dashboard_stats(UUID, DATE, DATE, TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS public.get_data_by_praca(UUID, DATE, DATE, TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS public.get_data_by_period(UUID, TEXT, DATE, DATE, TEXT[], TEXT[]);

--------------------------------------------------------------------------------
-- 1. get_dashboard_stats
-- Retorna estatísticas gerais do dashboard.
-- Parâmetros:
--   user_id_param: ID do usuário para filtrar dados com base nas permissões.
--   start_date: Data de início do filtro.
--   end_date: Data de fim do filtro.
--   sub_pracas: Array de sub-praças para filtrar.
--   origens: Array de origens para filtrar.
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
    user_id_param UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    sub_pracas TEXT[] DEFAULT NULL,
    origens TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    total_records BIGINT,
    total_ofertadas BIGINT,
    total_aceitas BIGINT,
    total_rejeitadas BIGINT,
    total_completadas BIGINT,
    total_canceladas BIGINT,
    total_pedidos_concluidos BIGINT,
    total_taxas BIGINT,
    data_range JSON,
    pracas_disponiveis TEXT[]
)
AS $$
DECLARE
  user_pracas TEXT[];
  is_user_admin BOOLEAN;
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
    RETURN QUERY SELECT 0, 0, 0, 0, 0, 0, 0, 0, '{"start_date": null, "end_date": null}', '{}';
  END IF;

  -- Construir query com base nas permissões
  WITH filtered_data AS (
    SELECT *
    FROM delivery_data
    WHERE 
      -- Filtro de data robusto com conversão para timestamp
      (start_date IS NULL OR data_do_periodo >= start_date::TIMESTAMP) AND
      (end_date IS NULL OR data_do_periodo < (end_date::TIMESTAMP + INTERVAL '1 day')) AND
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
  SELECT 
    COUNT(*),
    SUM(numero_de_corridas_ofertadas),
    SUM(numero_de_corridas_aceitas),
    SUM(numero_de_corridas_rejeitadas),
    SUM(numero_de_corridas_completadas),
    SUM(numero_de_corridas_canceladas_pela_pessoa_entregadora),
    SUM(numero_de_pedidos_aceitos_e_concluidos),
    SUM(soma_das_taxas_das_corridas_aceitas),
    json_build_object(
      'start_date', MIN(data_do_periodo::DATE),
      'end_date', MAX(data_do_periodo::DATE)
    ),
    (
      SELECT array_agg(DISTINCT praca)
      FROM filtered_data
      WHERE praca IS NOT NULL AND praca != ''
    )
  INTO total_records, total_ofertadas, total_aceitas, total_rejeitadas, total_completadas, total_canceladas, total_pedidos_concluidos, total_taxas, data_range, pracas_disponiveis
  FROM filtered_data;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--------------------------------------------------------------------------------
-- 2. get_data_by_praca
-- Retorna dados agrupados por praça.
-- Parâmetros:
--   user_id_param: ID do usuário para filtrar dados com base nas permissões.
--   start_date: Data de início do filtro.
--   end_date: Data de fim do filtro.
--   sub_pracas: Array de sub-praças para filtrar.
--   origens: Array de origens para filtrar.
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_data_by_praca(
    user_id_param UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    sub_pracas TEXT[] DEFAULT NULL,
    origens TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    praca TEXT,
    ofertadas BIGINT,
    aceitas BIGINT,
    rejeitadas BIGINT,
    completadas BIGINT
)
AS $$
DECLARE
  user_pracas TEXT[];
  is_user_admin BOOLEAN;
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
    RETURN;
  END IF;

  -- Construir e executar a query principal
  RETURN QUERY
  WITH filtered_data AS (
    SELECT *
    FROM public.delivery_data
    WHERE 
      -- Filtro de data robusto com conversão para timestamp
      (start_date IS NULL OR data_do_periodo >= start_date::TIMESTAMP) AND
      (end_date IS NULL OR data_do_periodo < (end_date::TIMESTAMP + INTERVAL '1 day')) AND
      -- Filtro de sub-praças
      (sub_pracas IS NULL OR array_length(sub_pracas, 1) = 0 OR sub_praca = ANY(sub_pracas)) AND
      -- Filtro de origens
      (origens IS NULL OR array_length(origens, 1) = 0 OR origem = ANY(origens)) AND
      (
        -- Lógica de permissão de praça
        COALESCE(is_user_admin, FALSE) OR
        praca = ANY(user_pracas) OR
        'Todas' = ANY(user_pracas)
      )
  )
  SELECT 
    fd.praca,
    SUM(fd.numero_de_corridas_ofertadas)::BIGINT,
    SUM(fd.numero_de_corridas_aceitas)::BIGINT,
    SUM(fd.numero_de_corridas_rejeitadas)::BIGINT,
    SUM(fd.numero_de_corridas_completadas)::BIGINT
  FROM filtered_data AS fd
  WHERE fd.praca IS NOT NULL AND fd.praca != ''
  GROUP BY fd.praca
  ORDER BY SUM(fd.numero_de_corridas_ofertadas) DESC;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--------------------------------------------------------------------------------
-- 3. get_data_by_period
-- Retorna dados agrupados por período (dia, semana, mês).
-- Parâmetros:
--   user_id_param: ID do usuário para filtrar dados com base nas permissões.
--   grouping_period: 'day', 'week', 'month' (ou outro período).
--   start_date: Data de início do filtro.
--   end_date: Data de fim do filtro.
--   sub_pracas: Array de sub-praças para filtrar.
--   origens: Array de origens para filtrar.
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_data_by_period(
    user_id_param UUID,
    grouping_period TEXT, -- 'day', 'week', 'month'
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    sub_pracas TEXT[] DEFAULT NULL,
    origens TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    period_start TIMESTAMP,
    ofertadas BIGINT,
    aceitas BIGINT,
    rejeitadas BIGINT,
    completadas BIGINT
)
AS $$
DECLARE
  user_pracas TEXT[];
  is_user_admin BOOLEAN;
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
    RETURN;
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
  SELECT 
    period_start,
    SUM(numero_de_corridas_ofertadas),
    SUM(numero_de_corridas_aceitas),
    SUM(numero_de_corridas_rejeitadas),
    SUM(numero_de_corridas_completadas)
  INTO period_start, ofertadas, aceitas, rejeitadas, completadas
  FROM (
    SELECT 
      CASE 
        WHEN grouping_period = 'day' THEN data_do_periodo::DATE
        WHEN grouping_period = 'week' THEN date_trunc('week', data_do_periodo::DATE)
        WHEN grouping_period = 'month' THEN date_trunc('month', data_do_periodo::DATE)
        ELSE data_do_periodo::DATE
      END AS period_start,
      SUM(numero_de_corridas_ofertadas) as total_ofertadas,
      SUM(numero_de_corridas_aceitas) as total_aceitas,
      SUM(numero_de_corridas_rejeitadas) as total_rejeitadas,
      SUM(numero_de_corridas_completadas) as total_completadas
    FROM filtered_data
    GROUP BY period_start
    ORDER BY period_start
  ) grouped_data;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. DADOS INICIAIS (EXEMPLO)
-- Criar um usuário admin inicial (substitua o UUID pelo ID do seu usuário)
-- INSERT INTO user_permissions (user_id, is_admin) 
-- VALUES ('SEU_USER_ID_AQUI', TRUE)
-- ON CONFLICT (user_id) DO UPDATE SET is_admin = TRUE;

-- 7. COMENTÁRIOS E DOCUMENTAÇÃO
COMMENT ON TABLE user_permissions IS 'Armazena permissões de acesso por usuário';
COMMENT ON COLUMN user_permissions.allowed_pracas IS 'Array de praças que o usuário pode visualizar';
COMMENT ON COLUMN user_permissions.is_admin IS 'Se TRUE, usuário tem acesso completo ao sistema';
