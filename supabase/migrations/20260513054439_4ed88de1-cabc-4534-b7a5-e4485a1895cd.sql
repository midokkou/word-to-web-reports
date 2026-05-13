CREATE TABLE public.form_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id TEXT NOT NULL,
  employee_name TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX form_records_form_id_idx ON public.form_records (form_id);

ALTER TABLE public.form_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read form records"
  ON public.form_records FOR SELECT
  USING (true);

CREATE POLICY "Public can insert form records"
  ON public.form_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update form records"
  ON public.form_records FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Public can delete form records"
  ON public.form_records FOR DELETE
  USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER form_records_set_updated_at
  BEFORE UPDATE ON public.form_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();