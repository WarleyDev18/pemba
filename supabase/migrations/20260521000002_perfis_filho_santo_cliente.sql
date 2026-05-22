-- =============================================================
-- Divide perfil 'publico' em 'filho_santo' e 'cliente'
-- filho_santo: acesso a comunicados
-- cliente: sem acesso a comunicados
-- =============================================================

-- 1. Remover constraint antiga
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;

-- 2. Migrar usuários existentes: 'publico' → 'filho_santo'
UPDATE usuarios SET perfil = 'filho_santo' WHERE perfil = 'publico';

-- 3. Adicionar nova constraint com os valores corretos
ALTER TABLE usuarios ADD CONSTRAINT usuarios_perfil_check
  CHECK (perfil IN ('admin', 'filho_santo', 'cliente'));

-- 3. Atualizar trigger para novos cadastros (default = 'cliente')
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'perfil', 'cliente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4. Atualizar policy de comunicados: só filho_santo e admin
DROP POLICY IF EXISTS "comunicados_select" ON comunicados;
CREATE POLICY "comunicados_select"
  ON comunicados FOR SELECT TO authenticated
  USING (
    get_meu_perfil() = 'admin'
    OR (get_meu_perfil() = 'filho_santo' AND publico = true)
  );
