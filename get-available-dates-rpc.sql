-- Função RPC para obter todas as datas disponíveis sem limitação de 1000 registros
CREATE OR REPLACE FUNCTION get_available_dates()
RETURNS TABLE (
  date TEXT,
  count BIGINT,
  formatted TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(data_do_periodo)::TEXT as date,
    COUNT(*) as count,
    TO_CHAR(DATE(data_do_periodo), 'DD/MM/YYYY') as formatted
  FROM delivery_data 
  WHERE data_do_periodo IS NOT NULL
  GROUP BY DATE(data_do_periodo)
  ORDER BY DATE(data_do_periodo) ASC;
END;
$$;

-- Política RLS para permitir acesso à função
CREATE POLICY "Users can call get_available_dates" ON delivery_data
FOR SELECT USING (true);

-- Comentário da função
COMMENT ON FUNCTION get_available_dates() IS 'Retorna todas as datas disponíveis com contagem de registros, sem limitação de 1000 registros';
