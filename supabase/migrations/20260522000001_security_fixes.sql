-- =============================================================
-- CORREÇÕES DE SEGURANÇA
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Adicionar SET search_path = public em todas as funções
--    SECURITY DEFINER (evita search_path poisoning)
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_meu_perfil()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT perfil FROM usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION fn_marcar_lidas_admin(p_conversa_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE mensagens
  SET lida = true
  WHERE conversa_id = p_conversa_id
    AND lida = false
    AND remetente_id = (
      SELECT usuario_id FROM conversas WHERE id = p_conversa_id
    );
$$;

CREATE OR REPLACE FUNCTION fn_marcar_lidas_usuario(p_conversa_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE mensagens
  SET lida = true
  WHERE conversa_id = p_conversa_id
    AND lida = false
    AND remetente_id != (
      SELECT usuario_id FROM conversas WHERE id = p_conversa_id
    );
$$;

-- ---------------------------------------------------------------
-- 2. Bloquear escalada de privilégio no cadastro público
--    Antes: qualquer usuário podia passar perfil='admin' no signup
--    Agora: só 'filho_santo' ou 'cliente' são aceitos do metadata
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfil text;
BEGIN
  -- Aceita apenas perfis não-privilegiados vindos do cadastro público
  v_perfil := CASE
    WHEN NEW.raw_user_meta_data->>'perfil' IN ('filho_santo', 'cliente')
    THEN NEW.raw_user_meta_data->>'perfil'
    ELSE 'cliente'
  END;

  INSERT INTO public.usuarios (id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_perfil
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------
-- 3. Restringir leitura de usuarios — usuário vê só a si mesmo
--    Admin vê todos. Antes era USING (true) = vazamento de dados.
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "usuarios_select" ON usuarios;
CREATE POLICY "usuarios_select"
  ON usuarios FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_meu_perfil() = 'admin');

-- ---------------------------------------------------------------
-- 4. Corrigir views — sem security_invoker elas bypassam RLS
--    e qualquer autenticado via JOIN veria dados de outros
-- ---------------------------------------------------------------

DROP VIEW IF EXISTS vw_doacoes_admin CASCADE;
CREATE VIEW vw_doacoes_admin
WITH (security_invoker = true)
AS
SELECT
  d.id,
  d.usuario_id,
  d.valor,
  d.metodo,
  d.status,
  d.mensagem,
  d.criado_em,
  u.nome,
  u.email
FROM doacoes d
LEFT JOIN usuarios u ON u.id = d.usuario_id;

DROP VIEW IF EXISTS vw_conversas_admin CASCADE;
CREATE VIEW vw_conversas_admin
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.usuario_id,
  u.nome,
  u.email,
  ult.conteudo  AS ultima_mensagem,
  ult.criado_em AS ultima_at,
  COALESCE(nl.cnt, 0) AS nao_lidas_admin
FROM conversas c
LEFT JOIN usuarios u ON u.id = c.usuario_id
LEFT JOIN LATERAL (
  SELECT conteudo, criado_em
  FROM mensagens
  WHERE conversa_id = c.id
  ORDER BY criado_em DESC
  LIMIT 1
) ult ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM mensagens
  WHERE conversa_id = c.id
    AND remetente_id = c.usuario_id
    AND lida = false
) nl ON true;

-- RLS das tabelas subjacentes já garante acesso correto com security_invoker
GRANT SELECT ON vw_doacoes_admin   TO authenticated;
GRANT SELECT ON vw_conversas_admin TO authenticated;

-- ---------------------------------------------------------------
-- 5. Criar RPCs que o webhook-pagseguro chama mas não existiam
--    Sem elas nenhuma doação era confirmada no banco
-- ---------------------------------------------------------------

DROP FUNCTION IF EXISTS fn_aprovar_doacao(uuid, text, jsonb);
DROP FUNCTION IF EXISTS fn_aprovar_doacao(uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS fn_cancelar_doacao(uuid, jsonb);
DROP FUNCTION IF EXISTS fn_cancelar_doacao(uuid, text, jsonb);

CREATE OR REPLACE FUNCTION fn_aprovar_doacao(
  p_doacao_id      uuid,
  p_charge_id      text    DEFAULT NULL,
  p_webhook_payload jsonb  DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE doacoes
  SET status = 'aprovado'
  WHERE id = p_doacao_id
    AND status = 'pendente';
END;
$$;

CREATE OR REPLACE FUNCTION fn_cancelar_doacao(
  p_doacao_id      uuid,
  p_webhook_payload jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE doacoes
  SET status = 'cancelado'
  WHERE id = p_doacao_id
    AND status != 'aprovado';  -- nunca cancela doação já aprovada
END;
$$;
