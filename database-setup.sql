-- =============================================
-- RESET E CONFIGURAÇÃO COMPLETA (RLS + RPC)
-- =============================================

-- 1. Limpar objetos antigos
DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON public.user_permissions;
DROP TRIGGER IF EXISTS trg_sync_admin_users_ins_upd ON public.user_permissions;
DROP TRIGGER IF EXISTS trg_sync_admin_users_del ON public.user_permissions;
DROP FUNCTION IF EXISTS public.handle_updated_at;
DROP FUNCTION IF EXISTS public.sync_admin_users;
DROP FUNCTION IF EXISTS public.get_dashboard_stats_v2;
DROP FUNCTION IF EXISTS public.get_data_by_praca_v2;
DROP FUNCTION IF EXISTS public.get_data_by_period_v2;
DROP TABLE IF EXISTS public.admin_users;
DROP TABLE IF EXISTS public.user_permissions;

-- 2. Tabela principal de permissões
CREATE TABLE public.user_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allowed_pracas TEXT[] DEFAULT '{}',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_is_admin ON public.user_permissions(is_admin);

-- 3. Tabela auxiliar de admins (para policies)
CREATE TABLE public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Funções auxiliares
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_admin_users()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.admin_users WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;

  IF NEW.is_admin THEN
    INSERT INTO public.admin_users(user_id) VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM public.admin_users WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Triggers
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_sync_admin_users_ins_upd
AFTER INSERT OR UPDATE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users();

CREATE TRIGGER trg_sync_admin_users_del
AFTER DELETE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users();

-- 6. RLS completo
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
-- admin_users é usado apenas internamente, sem RLS para evitar recursão
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_permissions' LOOP
    EXECUTE format('DROP POLICY %I ON public.user_permissions', pol.policyname);
  END LOOP;
END $$;

-- 7. Funções RPC atualizadas
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_v2(
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
  total_taxas NUMERIC,
  data_range JSON,
  pracas_disponiveis TEXT[]
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  viewer UUID := COALESCE(user_id_param, auth.uid());
  viewer_is_admin BOOLEAN := FALSE;
  viewer_pracas TEXT[] := '{}';
BEGIN
  IF viewer IS NULL THEN
    viewer_is_admin := TRUE;
  ELSE
    SELECT is_admin, allowed_pracas INTO viewer_is_admin, viewer_pracas
    FROM public.user_permissions
    WHERE user_id = viewer;
  END IF;

  RETURN QUERY
  WITH dados AS (
    SELECT *
    FROM public.delivery_data d
    WHERE
      (start_date IS NULL OR d.data_do_periodo::DATE >= start_date) AND
      (end_date IS NULL OR d.data_do_periodo::DATE <= end_date) AND
      (sub_pracas IS NULL OR array_length(sub_pracas,1)=0 OR d.sub_praca = ANY(sub_pracas)) AND
      (origens IS NULL OR array_length(origens,1)=0 OR d.origem = ANY(origens)) AND
      (
        viewer_is_admin
        OR 'Todas' = ANY(viewer_pracas)
        OR d.praca = ANY(viewer_pracas)
      )
  )
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(numero_de_corridas_ofertadas)::BIGINT,0),
    COALESCE(SUM(numero_de_corridas_aceitas)::BIGINT,0),
    COALESCE(SUM(numero_de_corridas_rejeitadas)::BIGINT,0),
    COALESCE(SUM(numero_de_corridas_completadas)::BIGINT,0),
    COALESCE(SUM(numero_de_corridas_canceladas_pela_pessoa_entregadora)::BIGINT,0),
    COALESCE(SUM(numero_de_pedidos_aceitos_e_concluidos)::BIGINT,0),
    COALESCE(SUM(soma_das_taxas_das_corridas_aceitas)::NUMERIC,0),
    json_build_object('start_date', MIN(data_do_periodo::DATE), 'end_date', MAX(data_do_periodo::DATE)),
    COALESCE(array_agg(DISTINCT praca) FILTER (WHERE praca IS NOT NULL AND praca <> ''), ARRAY[]::TEXT[])
  FROM dados;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_data_by_praca_v2(
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
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  viewer UUID := COALESCE(user_id_param, auth.uid());
  viewer_is_admin BOOLEAN := FALSE;
  viewer_pracas TEXT[] := '{}';
BEGIN
  IF viewer IS NULL THEN
    viewer_is_admin := TRUE;
  ELSE
    SELECT is_admin, allowed_pracas INTO viewer_is_admin, viewer_pracas
    FROM public.user_permissions
    WHERE user_id = viewer;
  END IF;

  RETURN QUERY
  WITH dados AS (
    SELECT *
    FROM public.delivery_data d
    WHERE
      (start_date IS NULL OR d.data_do_periodo::DATE >= start_date) AND
      (end_date IS NULL OR d.data_do_periodo::DATE <= end_date) AND
      (sub_pracas IS NULL OR array_length(sub_pracas,1)=0 OR d.sub_praca = ANY(sub_pracas)) AND
      (origens IS NULL OR array_length(origens,1)=0 OR d.origem = ANY(origens)) AND
      (
        viewer_is_admin
        OR viewer_pracas IS NULL
        OR COALESCE(array_length(viewer_pracas,1),0) = 0
        OR d.praca = ANY(viewer_pracas)
        OR 'Todas' = ANY(viewer_pracas)
      )
  )
  SELECT
    d.praca,
    COALESCE(SUM(d.numero_de_corridas_ofertadas)::BIGINT,0),
    COALESCE(SUM(d.numero_de_corridas_aceitas)::BIGINT,0),
    COALESCE(SUM(d.numero_de_corridas_rejeitadas)::BIGINT,0),
    COALESCE(SUM(d.numero_de_corridas_completadas)::BIGINT,0)
  FROM dados d
  WHERE d.praca IS NOT NULL AND d.praca <> ''
  GROUP BY d.praca
  ORDER BY ofertadas DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_data_by_period_v2(
  user_id_param UUID,
  grouping_period TEXT,
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
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  viewer UUID := COALESCE(user_id_param, auth.uid());
  viewer_is_admin BOOLEAN := FALSE;
  viewer_pracas TEXT[] := '{}';
BEGIN
  IF viewer IS NULL THEN
    viewer_is_admin := TRUE;
  ELSE
    SELECT is_admin, allowed_pracas INTO viewer_is_admin, viewer_pracas
    FROM public.user_permissions
    WHERE user_id = viewer;
  END IF;

  RETURN QUERY
  WITH dados AS (
    SELECT *
    FROM public.delivery_data d
    WHERE
      (start_date IS NULL OR d.data_do_periodo::DATE >= start_date) AND
      (end_date IS NULL OR d.data_do_periodo::DATE <= end_date) AND
      (sub_pracas IS NULL OR array_length(sub_pracas,1)=0 OR d.sub_praca = ANY(sub_pracas)) AND
      (origens IS NULL OR array_length(origens,1)=0 OR d.origem = ANY(origens)) AND
      (
        viewer_is_admin
        OR viewer_pracas IS NULL
        OR COALESCE(array_length(viewer_pracas,1),0) = 0
        OR d.praca = ANY(viewer_pracas)
        OR 'Todas' = ANY(viewer_pracas)
      )
  )
  SELECT
    CASE
      WHEN grouping_period = 'week' THEN date_trunc('week', d.data_do_periodo)
      WHEN grouping_period = 'month' THEN date_trunc('month', d.data_do_periodo)
      ELSE date_trunc('day', d.data_do_periodo)
    END,
    COALESCE(SUM(d.numero_de_corridas_ofertadas)::BIGINT,0),
    COALESCE(SUM(d.numero_de_corridas_aceitas)::BIGINT,0),
    COALESCE(SUM(d.numero_de_corridas_rejeitadas)::BIGINT,0),
    COALESCE(SUM(d.numero_de_corridas_completadas)::BIGINT,0)
  FROM dados d
  GROUP BY 1
  ORDER BY 1;
END;
$$;

-- 8. Garantir que o usuário padrão tenha permissão
/* Removemos a atribuição automática de praças.
   O admin deve configurar as permissões manualmente via aplicação. */

-- Verificar resultado
SELECT * FROM public.user_permissions;
