-- ===============================================
-- FUNÇÕES RPC CORRIGIDAS PARA BUSCAR CIDADES
-- ===============================================

-- Função para obter todas as cidades disponíveis no sistema
CREATE OR REPLACE FUNCTION get_available_cities()
RETURNS TABLE (
  praca TEXT,
  sub_pracas TEXT[],
  total_records BIGINT,
  last_import TIMESTAMPTZ
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

-- Função simplificada para obter estatísticas das cidades
CREATE OR REPLACE FUNCTION get_cities_stats()
RETURNS TABLE (
  total_cities BIGINT,
  total_records BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT d.praca) as total_cities,
    COUNT(*) as total_records
  FROM delivery_data d
  WHERE d.praca IS NOT NULL 
    AND d.praca != '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Testar as funções
SELECT 'Testando get_available_cities()' as test;
SELECT * FROM get_available_cities() LIMIT 5;

SELECT 'Testando get_cities_list()' as test;
SELECT * FROM get_cities_list() LIMIT 10;

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
  RAISE NOTICE '📈 Use get_cities_stats() para estatísticas básicas';
END $$;
