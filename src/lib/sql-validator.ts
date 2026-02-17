const ALLOWED_TABLES = [
  'poc_medbrain_wpp',
  'users',
  'survey_responses',
  'referral_referrers',
  'referral_referred',
  'medway_vs',
  'indice_focos',
  '"Dica_personalizada"',
  'vw_estatisticas_avaliacoes',
  'vw_feedbacks_textuais',
  'vw_pesquisas_completas',
  'db_medbrain_pct_nao_alunos_3_entradas',
  'db_medbrain_referred',
  'db_medbrain_referrers',
  'db_medbrain_wpp_formatted',
  'db_medbrain_wpp_formatted2',
  'db_medbrain_wpp_formatted3',
  'poc_medbrain_first_session',
  'poc_medbrain_last_session',
];

const ALLOWED_TABLES_LOWER = ALLOWED_TABLES.map((t) =>
  t.startsWith('"') ? t : t.toLowerCase()
);

const DML_DDL_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXECUTE|COPY)\b/i;

const DANGEROUS_FUNCTIONS =
  /\b(pg_read_file|pg_sleep|pg_terminate_backend|lo_import|lo_export|dblink|pg_\w+)\s*\(/i;

const TABLE_REFERENCE_REGEX =
  /(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+("?[\w]+"?(?:\."?[\w]+"?)?)/gi;

function extractTables(sql: string): string[] {
  const tables: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(TABLE_REFERENCE_REGEX.source, 'gi');
  while ((match = regex.exec(sql)) !== null) {
    let table = match[1].trim();
    // Strip schema prefix: public.users → users
    if (table.includes('.')) {
      table = table.split('.').pop()!;
    }
    // Strip alias — already handled by regex (first token only)
    tables.push(table);
  }
  return tables;
}

function isTableAllowed(table: string): boolean {
  if (table.startsWith('"')) {
    // Quoted identifier — exact match
    return ALLOWED_TABLES.includes(table);
  }
  // Unquoted — case-insensitive
  return ALLOWED_TABLES_LOWER.includes(table.toLowerCase());
}

export function validateSQL(sql: string): { valid: boolean; error?: string } {
  // 1. Trim and normalize whitespace
  const normalized = sql.trim().replace(/\s+/g, ' ');

  if (!normalized) {
    return { valid: false, error: 'Query vazia' };
  }

  // 2. Reject multiple statements (semicolon followed by text)
  const withoutStrings = normalized.replace(/'[^']*'/g, '');
  if (/;\s*\S/.test(withoutStrings)) {
    return { valid: false, error: 'Múltiplos statements não são permitidos' };
  }

  // 3. Reject CTEs (WITH at the beginning)
  if (/^\s*WITH\b/i.test(normalized)) {
    return { valid: false, error: 'CTEs (WITH) não são permitidos' };
  }

  // 4. Reject dangerous pg_* functions
  if (DANGEROUS_FUNCTIONS.test(normalized)) {
    return { valid: false, error: 'Funções de sistema não são permitidas' };
  }

  // 5. Reject DML/DDL keywords (but allow SELECT subqueries)
  // Check the main query and subqueries for DML
  if (DML_DDL_KEYWORDS.test(withoutStrings)) {
    return {
      valid: false,
      error: 'Apenas queries SELECT são permitidas',
    };
  }

  // 6. Must start with SELECT
  if (!/^\s*SELECT\b/i.test(normalized)) {
    return { valid: false, error: 'Query deve começar com SELECT' };
  }

  // 7. Whitelist table check
  const tables = extractTables(normalized);
  for (const table of tables) {
    if (!isTableAllowed(table)) {
      return { valid: false, error: `Tabela não permitida: ${table}` };
    }
  }

  return { valid: true };
}

export { ALLOWED_TABLES };
