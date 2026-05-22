-- =============================================================
-- Adiciona suporte a fotos nos eventos
-- =============================================================

-- 1. Coluna na tabela eventos
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS foto_url text;

-- 2. Bucket público de storage para fotos de eventos
INSERT INTO storage.buckets (id, name, public)
VALUES ('eventos', 'eventos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de storage
DROP POLICY IF EXISTS "eventos_foto_select" ON storage.objects;
DROP POLICY IF EXISTS "eventos_foto_insert" ON storage.objects;
DROP POLICY IF EXISTS "eventos_foto_delete" ON storage.objects;

-- Qualquer autenticado pode ver as fotos
CREATE POLICY "eventos_foto_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'eventos');

-- Só admin pode fazer upload
CREATE POLICY "eventos_foto_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'eventos' AND
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND perfil = 'admin')
  );

-- Só admin pode deletar
CREATE POLICY "eventos_foto_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'eventos' AND
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND perfil = 'admin')
  );
