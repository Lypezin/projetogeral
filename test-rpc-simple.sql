-- Teste simples da função RPC
-- Execute este SQL no Supabase para testar se a função está funcionando

-- Teste 1: Sem filtros
SELECT get_dashboard_stats(
  user_id_param := '0394936e-5382-4ee7-b335-874c787363e1'::UUID,
  start_date := NULL,
  end_date := NULL,
  sub_pracas := NULL,
  origens := NULL
);

-- Teste 2: Com filtro de data
SELECT get_dashboard_stats(
  user_id_param := '0394936e-5382-4ee7-b335-874c787363e1'::UUID,
  start_date := '2025-01-01'::DATE,
  end_date := '2025-01-02'::DATE,
  sub_pracas := NULL,
  origens := NULL
);

-- Teste 3: Verificar se há dados na tabela
SELECT COUNT(*) as total_records FROM delivery_data;

-- Teste 4: Verificar dados por data
SELECT 
  DATE(data_do_periodo) as data,
  COUNT(*) as registros
FROM delivery_data 
WHERE data_do_periodo IS NOT NULL
GROUP BY DATE(data_do_periodo)
ORDER BY data
LIMIT 10;
