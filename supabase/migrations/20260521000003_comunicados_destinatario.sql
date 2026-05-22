-- =============================================================
-- Troca campo 'publico' boolean por 'destinatario' enum
-- Permite admin escolher quem recebe cada comunicado
-- =============================================================

-- 1. Adicionar nova coluna
ALTER TABLE comunicados
  ADD COLUMN IF NOT EXISTS destinatario text NOT NULL DEFAULT 'filho_santo'
  CHECK (destinatario IN ('filho_santo', 'cliente', 'todos'));

-- 2. Dropar policy que depende da coluna antiga antes de remover a coluna
DROP POLICY IF EXISTS "comunicados_select" ON comunicados;

-- 3. Migrar dados existentes
UPDATE comunicados SET destinatario = 'filho_santo' WHERE publico IS NOT NULL;

-- 4. Remover coluna antiga
ALTER TABLE comunicados DROP COLUMN IF EXISTS publico;

-- 5. Recriar policy
CREATE POLICY "comunicados_select"
  ON comunicados FOR SELECT TO authenticated
  USING (
    get_meu_perfil() = 'admin'
    OR (get_meu_perfil() = 'filho_santo' AND destinatario IN ('filho_santo', 'todos'))
    OR (get_meu_perfil() = 'cliente'     AND destinatario IN ('cliente', 'todos'))
  );
