-- =============================================================
-- PEMBA — Schema completo
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor)
-- É seguro rodar múltiplas vezes (idempotente)
-- =============================================================

-- =============================================================
-- TABELAS
-- =============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome      text NOT NULL,
  email     text NOT NULL,
  perfil    text NOT NULL DEFAULT 'publico' CHECK (perfil IN ('admin', 'publico')),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comunicados (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo    text NOT NULL,
  conteudo  text NOT NULL,
  publico   boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eventos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo    text NOT NULL,
  descricao text,
  data      date NOT NULL,
  horario   time,
  tipo      text NOT NULL DEFAULT 'Outro',
  publico   boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  data        date NOT NULL,
  horario     time NOT NULL,
  tipo        text NOT NULL DEFAULT 'Consulta',
  valor       numeric(10,2),
  observacoes text,
  status      text NOT NULL DEFAULT 'pendente'
              CHECK (status IN ('pendente', 'confirmado', 'realizado', 'cancelado')),
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ebos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  descricao       text NOT NULL,
  materiais       text,
  data_realizacao date,
  valor           numeric(10,2),
  status          text NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'em_preparo', 'realizado')),
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financeiro (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  agendamento_id uuid REFERENCES agendamentos(id) ON DELETE SET NULL,
  ebo_id         uuid REFERENCES ebos(id) ON DELETE SET NULL,
  descricao      text NOT NULL,
  valor          numeric(10,2) NOT NULL,
  tipo           text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  status         text NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pago', 'pendente', 'cancelado')),
  data           date NOT NULL,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doacoes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  valor               numeric(10,2) NOT NULL,
  metodo              text NOT NULL CHECK (metodo IN ('pix', 'boleto', 'cartao')),
  status              text NOT NULL DEFAULT 'pendente'
                      CHECK (status IN ('pendente', 'aprovado', 'cancelado')),
  mensagem            text,
  pagseguro_order_id  text,
  pagseguro_qr_code   text,
  pagseguro_qr_texto  text,
  pagseguro_link      text,
  criado_em           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mensagens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id  uuid NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  remetente_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  conteudo     text NOT NULL,
  lida         boolean NOT NULL DEFAULT false,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- COLUNAS QUE PODEM ESTAR FALTANDO EM TABELAS JÁ EXISTENTES
-- =============================================================

ALTER TABLE doacoes ADD COLUMN IF NOT EXISTS mensagem           text;
ALTER TABLE doacoes ADD COLUMN IF NOT EXISTS pagseguro_order_id text;
ALTER TABLE doacoes ADD COLUMN IF NOT EXISTS pagseguro_qr_code  text;
ALTER TABLE doacoes ADD COLUMN IF NOT EXISTS pagseguro_qr_texto text;
ALTER TABLE doacoes ADD COLUMN IF NOT EXISTS pagseguro_link     text;

-- =============================================================
-- FUNÇÃO HELPER — lê perfil sem bater nas policies (SECURITY DEFINER)
-- =============================================================

CREATE OR REPLACE FUNCTION get_meu_perfil()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT perfil FROM usuarios WHERE id = auth.uid();
$$;

-- =============================================================
-- FUNÇÕES DO CHAT
-- =============================================================

-- Admin abre conversa → marca mensagens do usuário como lidas
CREATE OR REPLACE FUNCTION fn_marcar_lidas_admin(p_conversa_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE mensagens
  SET lida = true
  WHERE conversa_id = p_conversa_id
    AND lida = false
    AND remetente_id = (
      SELECT usuario_id FROM conversas WHERE id = p_conversa_id
    );
$$;

-- Usuário abre chat → marca mensagens do admin como lidas
CREATE OR REPLACE FUNCTION fn_marcar_lidas_usuario(p_conversa_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE mensagens
  SET lida = true
  WHERE conversa_id = p_conversa_id
    AND lida = false
    AND remetente_id != (
      SELECT usuario_id FROM conversas WHERE id = p_conversa_id
    );
$$;

-- =============================================================
-- RLS — habilitar em todas as tabelas
-- =============================================================

ALTER TABLE usuarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicados   ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro    ENABLE ROW LEVEL SECURITY;
ALTER TABLE doacoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens     ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- POLICIES — usuarios
-- =============================================================

DROP POLICY IF EXISTS "usuarios_select"       ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_admin" ON usuarios;

-- Qualquer autenticado pode ler (necessário para dropdowns e AuthContext)
CREATE POLICY "usuarios_select"
  ON usuarios FOR SELECT TO authenticated
  USING (true);

-- Só admin pode alterar perfil de outros
CREATE POLICY "usuarios_update_admin"
  ON usuarios FOR UPDATE TO authenticated
  USING (get_meu_perfil() = 'admin');

-- =============================================================
-- POLICIES — comunicados
-- =============================================================

DROP POLICY IF EXISTS "comunicados_select" ON comunicados;
DROP POLICY IF EXISTS "comunicados_admin"  ON comunicados;

CREATE POLICY "comunicados_select"
  ON comunicados FOR SELECT TO authenticated
  USING (publico = true OR get_meu_perfil() = 'admin');

CREATE POLICY "comunicados_admin"
  ON comunicados FOR ALL TO authenticated
  USING (get_meu_perfil() = 'admin')
  WITH CHECK (get_meu_perfil() = 'admin');

-- =============================================================
-- POLICIES — eventos
-- =============================================================

DROP POLICY IF EXISTS "eventos_select" ON eventos;
DROP POLICY IF EXISTS "eventos_admin"  ON eventos;

CREATE POLICY "eventos_select"
  ON eventos FOR SELECT TO authenticated
  USING (publico = true OR get_meu_perfil() = 'admin');

CREATE POLICY "eventos_admin"
  ON eventos FOR ALL TO authenticated
  USING (get_meu_perfil() = 'admin')
  WITH CHECK (get_meu_perfil() = 'admin');

-- =============================================================
-- POLICIES — agendamentos
-- =============================================================

DROP POLICY IF EXISTS "agendamentos_select" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_insert" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_update" ON agendamentos;
DROP POLICY IF EXISTS "agendamentos_delete" ON agendamentos;

CREATE POLICY "agendamentos_select"
  ON agendamentos FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR get_meu_perfil() = 'admin');

CREATE POLICY "agendamentos_insert"
  ON agendamentos FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR get_meu_perfil() = 'admin');

CREATE POLICY "agendamentos_update"
  ON agendamentos FOR UPDATE TO authenticated
  USING (get_meu_perfil() = 'admin');

CREATE POLICY "agendamentos_delete"
  ON agendamentos FOR DELETE TO authenticated
  USING (get_meu_perfil() = 'admin');

-- =============================================================
-- POLICIES — ebos
-- =============================================================

DROP POLICY IF EXISTS "ebos_select" ON ebos;
DROP POLICY IF EXISTS "ebos_insert" ON ebos;
DROP POLICY IF EXISTS "ebos_update" ON ebos;
DROP POLICY IF EXISTS "ebos_delete" ON ebos;

CREATE POLICY "ebos_select"
  ON ebos FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR get_meu_perfil() = 'admin');

CREATE POLICY "ebos_insert"
  ON ebos FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR get_meu_perfil() = 'admin');

CREATE POLICY "ebos_update"
  ON ebos FOR UPDATE TO authenticated
  USING (get_meu_perfil() = 'admin');

CREATE POLICY "ebos_delete"
  ON ebos FOR DELETE TO authenticated
  USING (get_meu_perfil() = 'admin');

-- =============================================================
-- POLICIES — financeiro (somente admin)
-- =============================================================

DROP POLICY IF EXISTS "financeiro_admin" ON financeiro;

CREATE POLICY "financeiro_admin"
  ON financeiro FOR ALL TO authenticated
  USING (get_meu_perfil() = 'admin')
  WITH CHECK (get_meu_perfil() = 'admin');

-- =============================================================
-- POLICIES — doacoes
-- =============================================================

DROP POLICY IF EXISTS "doacoes_select" ON doacoes;
DROP POLICY IF EXISTS "doacoes_insert" ON doacoes;
DROP POLICY IF EXISTS "doacoes_update" ON doacoes;

CREATE POLICY "doacoes_select"
  ON doacoes FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR get_meu_perfil() = 'admin');

CREATE POLICY "doacoes_insert"
  ON doacoes FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "doacoes_update"
  ON doacoes FOR UPDATE TO authenticated
  USING (get_meu_perfil() = 'admin');

-- =============================================================
-- POLICIES — conversas
-- =============================================================

DROP POLICY IF EXISTS "conversas_select" ON conversas;
DROP POLICY IF EXISTS "conversas_insert" ON conversas;

CREATE POLICY "conversas_select"
  ON conversas FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR get_meu_perfil() = 'admin');

CREATE POLICY "conversas_insert"
  ON conversas FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- =============================================================
-- POLICIES — mensagens
-- =============================================================

DROP POLICY IF EXISTS "mensagens_select" ON mensagens;
DROP POLICY IF EXISTS "mensagens_insert" ON mensagens;
DROP POLICY IF EXISTS "mensagens_update" ON mensagens;

CREATE POLICY "mensagens_select"
  ON mensagens FOR SELECT TO authenticated
  USING (
    get_meu_perfil() = 'admin'
    OR EXISTS (
      SELECT 1 FROM conversas c
      WHERE c.id = conversa_id AND c.usuario_id = auth.uid()
    )
  );

CREATE POLICY "mensagens_insert"
  ON mensagens FOR INSERT TO authenticated
  WITH CHECK (
    get_meu_perfil() = 'admin'
    OR (
      remetente_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM conversas c
        WHERE c.id = conversa_id AND c.usuario_id = auth.uid()
      )
    )
  );

-- Admin pode marcar mensagens como lidas (UPDATE)
CREATE POLICY "mensagens_update"
  ON mensagens FOR UPDATE TO authenticated
  USING (get_meu_perfil() = 'admin');

-- =============================================================
-- VIEWS
-- =============================================================

DROP VIEW IF EXISTS vw_doacoes_admin CASCADE;
DROP VIEW IF EXISTS vw_conversas_admin CASCADE;

CREATE OR REPLACE VIEW vw_doacoes_admin AS
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

CREATE OR REPLACE VIEW vw_conversas_admin AS
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

-- Permissão para usuários autenticados lerem as views
GRANT SELECT ON vw_doacoes_admin  TO authenticated;
GRANT SELECT ON vw_conversas_admin TO authenticated;
