-- ===============================================
-- FUNÇÃO RPC PARA BUSCAR CIDADES DISTINTAS
-- ===============================================

-- Função para obter todas as cidades disponíveis no sistema
CREATE OR REPLACE FUNCTION get_available_cities()
RETURNS TABLE (
  praca TEXT,
  sub_pracas TEXT[],
  total_records BIGINT,
  last_import TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.praca,
    ARRAY_AGG(DISTINCT d.sub_praca ORDER BY d.sub_praca) as sub_pracas,
    COUNT(*) as total_records,
    MAX(d.created_at) as last_import
  FROM delivery_data d
  WHERE d.praca IS NOT NULL 
    AND d.praca != ''
  GROUP BY d.praca
  ORDER BY d.praca;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter apenas a lista de cidades (nomes)
CREATE OR REPLACE FUNCTION get_cities_list()
RETURNS TABLE (praca TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT d.praca
  FROM delivery_data d
  WHERE d.praca IS NOT NULL 
    AND d.praca != ''
  ORDER BY d.praca;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter sub-praças de uma cidade específica
CREATE OR REPLACE FUNCTION get_sub_pracas_by_city(city_name TEXT)
RETURNS TABLE (sub_praca TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT d.sub_praca
  FROM delivery_data d
  WHERE d.praca = city_name
    AND d.sub_praca IS NOT NULL 
    AND d.sub_praca != ''
  ORDER BY d.sub_praca;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se uma cidade existe
CREATE OR REPLACE FUNCTION city_exists(city_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  city_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO city_count
  FROM delivery_data d
  WHERE d.praca = city_name;
  
  RETURN city_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas das cidades
CREATE OR REPLACE FUNCTION get_cities_stats()
RETURNS TABLE (
  total_cities BIGINT,
  total_records BIGINT,
  cities_with_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT d.praca) as total_cities,
    COUNT(*) as total_records,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'praca', d.praca,
          'sub_pracas', sub_pracas.sub_pracas,
          'count', sub_pracas.total_records,
          'last_import', sub_pracas.last_import
        ) ORDER BY d.praca
      ) FILTER (WHERE d.praca IS NOT NULL),
      '[]'::jsonb
    ) as cities_with_data
  FROM delivery_data d
  LEFT JOIN (
    SELECT 
      praca,
      ARRAY_AGG(DISTINCT sub_praca ORDER BY sub_praca) as sub_pracas,
      COUNT(*) as total_records,
      MAX(created_at) as last_import
    FROM delivery_data
    WHERE praca IS NOT NULL AND praca != ''
    GROUP BY praca
  ) sub_pracas ON d.praca = sub_pracas.praca
  WHERE d.praca IS NOT NULL AND d.praca != '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Testar as funções
SELECT 'Testando get_available_cities()' as test;
SELECT * FROM get_available_cities();

SELECT 'Testando get_cities_list()' as test;
SELECT * FROM get_cities_list();

SELECT 'Testando get_cities_stats()' as test;
SELECT * FROM get_cities_stats();

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE '🎉 Funções RPC para cidades criadas com sucesso!';
  RAISE NOTICE '📊 Use get_available_cities() para obter todas as cidades com detalhes';
  RAISE NOTICE '📋 Use get_cities_list() para obter apenas os nomes das cidades';
  RAISE NOTICE '🔍 Use get_sub_pracas_by_city(nome_cidade) para sub-praças específicas';
  RAISE NOTICE '✅ Use city_exists(nome_cidade) para verificar se cidade existe';
  RAISE NOTICE '📈 Use get_cities_stats() para estatísticas completas';
END $$;
