// Static mapping: categorias → GAs (Grande Área)
const CATEGORY_GA_MAP: Record<string, string> = {
  // Clínica Médica
  'cardiologia': 'Clínica Médica',
  'endocrinologia': 'Clínica Médica',
  'gastroenterologia': 'Clínica Médica',
  'nefrologia': 'Clínica Médica',
  'pneumologia': 'Clínica Médica',
  'reumatologia': 'Clínica Médica',
  'neurologia': 'Clínica Médica',
  'hematologia': 'Clínica Médica',
  'infectologia': 'Clínica Médica',
  'dermatologia': 'Clínica Médica',
  'geriatria': 'Clínica Médica',
  'clínica médica': 'Clínica Médica',

  // Cirurgia
  'cirurgia geral': 'Cirurgia',
  'cirurgia': 'Cirurgia',
  'ortopedia': 'Cirurgia',
  'urologia': 'Cirurgia',
  'cirurgia vascular': 'Cirurgia',
  'otorrinolaringologia': 'Cirurgia',
  'oftalmologia': 'Cirurgia',

  // Pediatria
  'pediatria': 'Pediatria',
  'neonatologia': 'Pediatria',

  // Ginecologia e Obstetrícia
  'ginecologia': 'Ginecologia e Obstetrícia',
  'obstetrícia': 'Ginecologia e Obstetrícia',
  'ginecologia e obstetrícia': 'Ginecologia e Obstetrícia',

  // Medicina Preventiva
  'medicina preventiva': 'Medicina Preventiva',
  'epidemiologia': 'Medicina Preventiva',
  'saúde pública': 'Medicina Preventiva',
  'saúde coletiva': 'Medicina Preventiva',
  'medicina de família': 'Medicina Preventiva',
  'atenção primária': 'Medicina Preventiva',

  // Psiquiatria
  'psiquiatria': 'Psiquiatria',
  'saúde mental': 'Psiquiatria',

  // Emergência
  'emergência': 'Emergência',
  'urgência': 'Emergência',
  'medicina de emergência': 'Emergência',
};

export function mapCategoryToGA(categoria: string): string | null {
  const lower = categoria.toLowerCase().trim();

  // Exact match
  if (CATEGORY_GA_MAP[lower]) {
    return CATEGORY_GA_MAP[lower];
  }

  // Fuzzy match: check if any key is contained in the category
  for (const [key, ga] of Object.entries(CATEGORY_GA_MAP)) {
    if (lower.includes(key) || key.includes(lower)) {
      return ga;
    }
  }

  return null;
}

export { CATEGORY_GA_MAP };
