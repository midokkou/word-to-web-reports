import data from "./forms.json";

export type FormItem = string;
export type SchoolForm = {
  id: string;
  title: string;
  items: FormItem[];
};

const slugify = (s: string, i: number) => `form-${i + 1}`;

export const forms: SchoolForm[] = (data as { title: string; items: string[] }[]).map(
  (f, i) => ({ id: slugify(f.title, i), title: f.title, items: f.items })
);

export const getForm = (id: string) => forms.find((f) => f.id === id);
