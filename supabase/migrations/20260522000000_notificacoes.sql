-- =============================================================
-- Notificações: comunicados e eventos publicados pelo admin
-- =============================================================

-- 1. Tabela
CREATE TABLE IF NOT EXISTS notificacoes (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id   uuid        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo         text        NOT NULL CHECK (tipo IN ('comunicado', 'evento')),
  referencia_id uuid       NOT NULL,
  titulo       text        NOT NULL,
  lida         boolean     NOT NULL DEFAULT false,
  criada_em    timestamptz DEFAULT now()
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- 2. RLS
DROP POLICY IF EXISTS "notificacoes_select" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_update" ON notificacoes;

CREATE POLICY "notificacoes_select" ON notificacoes
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "notificacoes_update" ON notificacoes
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- 3. Trigger: novo comunicado → notifica usuários pelo destinatário
CREATE OR REPLACE FUNCTION fn_notificar_comunicado()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notificacoes (usuario_id, tipo, referencia_id, titulo)
  SELECT u.id, 'comunicado', NEW.id, NEW.titulo
  FROM usuarios u
  WHERE u.perfil IN ('filho_santo', 'cliente')
    AND (
      NEW.destinatario = 'todos'
      OR NEW.destinatario = u.perfil
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_notificar_comunicado ON comunicados;
CREATE TRIGGER tg_notificar_comunicado
  AFTER INSERT ON comunicados
  FOR EACH ROW EXECUTE FUNCTION fn_notificar_comunicado();

-- 4. Trigger: evento público → notifica todos os usuários
--    Só dispara quando publico passa de false para true (ou novo evento já público)
CREATE OR REPLACE FUNCTION fn_notificar_evento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.publico = true AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.publico IS DISTINCT FROM true))) THEN
    INSERT INTO notificacoes (usuario_id, tipo, referencia_id, titulo)
    SELECT u.id, 'evento', NEW.id, NEW.titulo
    FROM usuarios u
    WHERE u.perfil IN ('filho_santo', 'cliente');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_notificar_evento ON eventos;
CREATE TRIGGER tg_notificar_evento
  AFTER INSERT OR UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION fn_notificar_evento();
