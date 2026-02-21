#!/usr/bin/env node
/**
 * generate-schema-context.mjs
 *
 * Conecta ao banco de dados e gera/atualiza o arquivo src/lib/schema-context.ts
 * com informações detalhadas de cada tabela (colunas, tipos, row counts,
 * valores de exemplo para colunas categóricas, ranges de datas, stats numéricas).
 *
 * Uso:
 *   node scripts/generate-schema-context.mjs
 *
 * Requer: DATABASE_URL no ambiente (via .env.local, export, ou Vercel CLI)
 *
 * Pode ser executado:
 *   - Manualmente quando novas tabelas forem adicionadas
 *   - Via CI/CD (ex: GitHub Action periódico)
 *   - Via npm script: "schema:update": "node scripts/generate-schema-context.mjs"
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

// ──────────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const OUTPUT_FILE = resolve(PROJECT_ROOT, 'src/lib/schema-context.ts');
const VALIDATOR_FILE = resolve(PROJECT_ROOT, 'src/lib/sql-validator.ts');

// Colunas sensíveis/pesadas que NÃO devem ter DISTINCT computado
const SKIP_DISTINCT_COLS = new Set([
  'message', 'content', 'Pergunta_do_aluno', 'AI_Answer', 'feedback_text',
  'student_message', 'question_snapshot', 'answer_snapshot', 'resposta_ia',
  'pergunta_usuario', 'resposta_preview', 'metadata', 'embedding',
  'phone', 'referrer_phone', 'referred_phone', 'session_id',
  'telefone_usuario', 'user_email', 'id', 'referrer_id', 'student_id',
  'pesquisa_id', 'conversa_id', 'message_id', 'response_id', 'file_id',
  'referral_code', 'user_name', 'file_name',
]);

// Descrições manuais (semânticas) para cada tabela — editáveis pelo dev
const TABLE_DESCRIPTIONS = {
  poc_medbrain_wpp: {
    desc: 'Tabela principal de todas as mensagens do chatbot Medbrain via WhatsApp. Cada linha = uma interação (pergunta+resposta). É a tabela mais importante.',
    usage: 'volume de mensagens, usuários únicos (COUNT DISTINCT session_id), categorias médicas, tempo de resposta, padrões temporais, conteúdo das conversas.',
    notes: 'NUNCA usar id para ORDER BY (IDs não-contíguos).',
  },
  users: {
    desc: 'Cadastro de usuários do sistema com dados agregados.',
    usage: 'dados cadastrais, total de mensagens por usuário, status de pesquisa CSAT.',
    notes: 'NÃO usar para contar "novos usuários" — usar poc_medbrain_first_session para isso!',
  },
  survey_responses: {
    desc: 'Respostas de pesquisa de satisfação (CSAT). Cada linha = uma avaliação (1-5 estrelas) + emoji + feedback opcional.',
    usage: 'CSAT médio, distribuição de notas, taxa de feedback, avaliações por período.',
    notes: 'conversation_id é FK para poc_medbrain_wpp.id. session_id é o telefone do usuário.',
  },
  referral_referrers: {
    desc: 'Usuários que indicaram outros (programa de indicação).',
    usage: 'top referenciadores, total de indicações, ranking.',
  },
  referral_referred: {
    desc: 'Usuários que foram indicados por outros.',
    usage: 'crescimento por indicação, rastrear quem indicou quem.',
    notes: 'referrer_id é FK para referral_referrers.id.',
  },
  medway_vs: {
    desc: 'Base de conhecimento RAG — documentos de estudo médico divididos em chunks de texto.',
    usage: 'cobertura da base de conhecimento, materiais por Grande Área (GA), total de tokens.',
    notes: 'NÃO consultar coluna embedding (pesada e binária). ga = Grande Área médica.',
  },
  indice_focos: {
    desc: 'Índice de focos/competências do currículo médico (CFAs — Competências, Focos, Áreas).',
    usage: 'mapeamento curricular, quantos focos/temas existem por GA.',
    notes: 'NÃO consultar coluna embedding.',
  },
  Dica_personalizada: {
    desc: 'Dicas de estudo personalizadas geradas pela IA para alunos Medway.',
    usage: 'dicas recentes, quantas dicas por tema/GA, conteúdo gerado pela IA.',
    notes: 'Nome da tabela e colunas CamelCase requerem "aspas duplas" SEMPRE! Usar "Dica_personalizada" na query.',
  },
  vw_estatisticas_avaliacoes: {
    desc: 'View pré-calculada com estatísticas agregadas de avaliações CSAT.',
    usage: 'resumo rápido de satisfação, distribuição de notas, médias. Mais rápida que agregar survey_responses.',
  },
  vw_feedbacks_textuais: {
    desc: 'View de feedbacks textuais dos usuários com análise de sentimento automática.',
    usage: 'feedbacks negativos, análise de sentimento, identificar problemas de qualidade.',
    notes: 'sentimento_detectado pode ser: Positivo, Negativo, Neutro.',
  },
  vw_pesquisas_completas: {
    desc: 'Visão completa das pesquisas CSAT com dados da conversa original (pergunta, resposta, tempo).',
    usage: 'análise detalhada de satisfação com contexto completo da conversa.',
  },
  db_medbrain_pct_nao_alunos_3_entradas: {
    desc: 'Métrica pré-calculada: % de não-alunos que retornaram 3+ vezes (engajamento orgânico).',
    usage: 'tendência de engajamento de não-alunos ao longo do tempo. KPI principal: percentual_com_3_entradas.',
  },
  db_medbrain_referred: {
    desc: 'View de usuários indicados com datas formatadas (data e horário separados).',
    usage: 'crescimento diário de indicações, análise temporal de referral.',
  },
  db_medbrain_referrers: {
    desc: 'View de referenciadores com datas formatadas.',
    usage: 'ranking de referenciadores, evolução temporal de indicações.',
  },
  db_medbrain_wpp_formatted: {
    desc: 'View formatada de poc_medbrain_wpp com created_at_formatado em texto.',
    usage: 'consultas que precisam do timestamp pré-formatado.',
  },
  db_medbrain_wpp_formatted2: {
    desc: 'View formatada de poc_medbrain_wpp com data/hora separados e campo "aluno" em texto.',
    usage: 'consultas que precisam de data e horário em colunas separadas (mais conveniente). Inclui execution_time.',
  },
  db_medbrain_wpp_formatted3: {
    desc: 'View formatada de poc_medbrain_wpp com data/hora separados (sem execution_time).',
    usage: 'consultas que precisam de data e horário separados, versão leve sem execution_time.',
  },
  poc_medbrain_first_session: {
    desc: 'PRIMEIRA sessão de cada usuário — registra quando cada pessoa usou o bot pela primeira vez.',
    usage: 'contar NOVOS USUÁRIOS por dia, taxa de aquisição.',
    notes: 'IMPORTANTE: Para "novos usuários" ou "primeiros acessos", use ESTA tabela, NÃO a tabela users! Coluna é create_at_data (sem "d", typo no banco).',
  },
  poc_medbrain_last_session: {
    desc: 'ÚLTIMA sessão de cada usuário — quando cada pessoa usou o bot pela última vez.',
    usage: 'análise de retenção/churn, identificar usuários inativos.',
    notes: 'Coluna é create_at_data (sem "d", typo no banco).',
  },
};

// Perguntas frequentes → tabela correta (header do schema)
const FAQ_MAPPING = `
PERGUNTAS FREQUENTES E QUAL TABELA USAR:

- "Quantos novos usuários?" → poc_medbrain_first_session (NÃO users!)
  Exemplo: SELECT create_at_data as dia, COUNT(*) FROM poc_medbrain_first_session GROUP BY dia

- "Quantas mensagens/conversas?" → poc_medbrain_wpp
  Exemplo: SELECT COUNT(*) FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2

- "Quantos usuários únicos?" → COUNT(DISTINCT session_id) FROM poc_medbrain_wpp

- "Satisfação/CSAT/avaliação?" → survey_responses ou vw_estatisticas_avaliacoes
  Exemplo: SELECT AVG(response_stars) FROM survey_responses

- "Feedbacks negativos/textuais?" → vw_feedbacks_textuais

- "Categorias/temas mais perguntados?" → poc_medbrain_wpp (colunas categoria e subcategoria)

- "Referral/indicações?" → referral_referrers + db_medbrain_referred

- "Base de conhecimento/RAG?" → medway_vs ou indice_focos

- "Dicas personalizadas?" → "Dica_personalizada" (com aspas duplas!)

- "Engajamento de não-alunos?" → db_medbrain_pct_nao_alunos_3_entradas

- "Tempo de resposta/performance?" → poc_medbrain_wpp (coluna execution_time)

- "Dados de um usuário/telefone?" → users (cadastro) ou poc_medbrain_wpp (mensagens)

- "Novos vs retornando?" → poc_medbrain_first_session (novos) + poc_medbrain_wpp (total)

- "Quando foi a última vez que o usuário X usou?" → poc_medbrain_last_session

- "Alunos vs não-alunos?" → poc_medbrain_wpp (coluna "É aluno?") ou users (coluna is_student)
`;

// ──────────────────────────────────────────────────────────────────
// Load .env
// ──────────────────────────────────────────────────────────────────

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    try {
      const content = readFileSync(resolve(PROJECT_ROOT, f), 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match && !process.env[match[1].trim()]) {
          process.env[match[1].trim()] = match[2].trim();
        }
      }
    } catch { /* skip */ }
  }
}

// ──────────────────────────────────────────────────────────────────
// Database introspection
// ──────────────────────────────────────────────────────────────────

async function introspectTable(client, tableName) {
  const sqlName = /[A-Z]/.test(tableName) ? `"${tableName}"` : tableName;

  // Row count
  let rowCount = 0;
  try {
    const res = await client.query(`SELECT COUNT(*)::int as cnt FROM ${sqlName}`);
    rowCount = res.rows[0]?.cnt ?? 0;
  } catch (e) {
    return { error: e.message };
  }

  // Columns from information_schema
  const colRes = await client.query(
    `SELECT column_name, data_type, is_nullable, character_maximum_length
     FROM information_schema.columns
     WHERE table_name = $1 AND table_schema = 'public'
     ORDER BY ordinal_position`,
    [tableName]
  );
  const columns = colRes.rows;

  // Distinct values for categorical text/bool columns
  const distinctValues = {};
  const textCols = columns.filter(c =>
    ['text', 'character varying', 'boolean', 'USER-DEFINED'].includes(c.data_type) &&
    !SKIP_DISTINCT_COLS.has(c.column_name)
  );

  for (const col of textCols) {
    const colSql = /[A-Z\s?!@#$%^&*()\-]/.test(col.column_name) || /^\d/.test(col.column_name) ? `"${col.column_name}"` : col.column_name;
    try {
      const res = await client.query(
        `SELECT DISTINCT ${colSql}::text as val FROM ${sqlName} WHERE ${colSql} IS NOT NULL ORDER BY val LIMIT 25`
      );
      const vals = res.rows.map(r => r.val).filter(v => v && v.length < 80);
      if (vals.length > 0 && vals.length <= 25) {
        distinctValues[col.column_name] = vals;
      }
    } catch { /* skip */ }
  }

  // Date ranges
  const dateRanges = {};
  const dateCols = columns.filter(c =>
    ['timestamp with time zone', 'timestamp without time zone', 'date'].includes(c.data_type)
  );
  for (const col of dateCols) {
    const colSql = /[A-Z\s?!@#$%^&*()\-]/.test(col.column_name) || /^\d/.test(col.column_name) ? `"${col.column_name}"` : col.column_name;
    try {
      const res = await client.query(
        `SELECT MIN(${colSql})::date::text as min_dt, MAX(${colSql})::date::text as max_dt FROM ${sqlName}`
      );
      if (res.rows[0]?.min_dt) {
        dateRanges[col.column_name] = { min: res.rows[0].min_dt, max: res.rows[0].max_dt };
      }
    } catch { /* skip */ }
  }

  // Numeric stats
  const numStats = {};
  const numCols = columns.filter(c =>
    ['integer', 'bigint', 'numeric', 'real', 'double precision', 'smallint'].includes(c.data_type) &&
    !['id', 'chunk_index', 'total_chunks', 'conversation_id'].includes(c.column_name)
  );
  for (const col of numCols) {
    const colSql = /[A-Z\s?!@#$%^&*()\-]/.test(col.column_name) || /^\d/.test(col.column_name) ? `"${col.column_name}"` : col.column_name;
    try {
      const res = await client.query(
        `SELECT MIN(${colSql})::numeric as min_val, MAX(${colSql})::numeric as max_val,
                ROUND(AVG(${colSql})::numeric, 2) as avg_val
         FROM ${sqlName} WHERE ${colSql} IS NOT NULL`
      );
      if (res.rows[0]?.min_val != null) {
        numStats[col.column_name] = {
          min: Number(res.rows[0].min_val),
          max: Number(res.rows[0].max_val),
          avg: Number(res.rows[0].avg_val),
        };
      }
    } catch { /* skip */ }
  }

  return { rowCount, columns, distinctValues, dateRanges, numStats };
}

// ──────────────────────────────────────────────────────────────────
// Generate schema text
// ──────────────────────────────────────────────────────────────────

function formatColumn(col, distinctValues, numStats) {
  const nullable = col.is_nullable === 'YES' ? ', nullable' : '';
  const maxLen = col.character_maximum_length ? ` [max ${col.character_maximum_length}]` : '';

  // Map pg data types to shorter names
  const typeMap = {
    'integer': 'int',
    'bigint': 'bigint',
    'smallint': 'smallint',
    'numeric': 'numeric',
    'real': 'float',
    'double precision': 'float',
    'character varying': 'varchar',
    'text': 'text',
    'boolean': 'bool',
    'date': 'date',
    'timestamp with time zone': 'timestamptz',
    'timestamp without time zone': 'timestamp',
    'uuid': 'uuid',
    'jsonb': 'jsonb',
    'json': 'json',
    'USER-DEFINED': 'custom',
    'ARRAY': 'array',
  };
  const shortType = typeMap[col.data_type] || col.data_type;

  // Needs quotes if has uppercase, spaces, special chars, or starts with digit
  const needsQuotes = /[A-Z\s?!@#$%^&*()\-]/.test(col.column_name) || /^\d/.test(col.column_name);
  const colDisplay = needsQuotes ? `"${col.column_name}"` : col.column_name;

  let line = `    ${colDisplay} (${shortType}${maxLen}${nullable})`;

  // Add distinct values inline
  if (distinctValues[col.column_name]) {
    const vals = distinctValues[col.column_name];
    if (vals.length <= 10) {
      line += ` — Valores: ${vals.join(', ')}`;
    } else {
      line += ` — Exemplos: ${vals.slice(0, 10).join(', ')}... (${vals.length}+ valores)`;
    }
  }

  // Add numeric stats inline
  if (numStats[col.column_name]) {
    const s = numStats[col.column_name];
    line += ` — Range: ${s.min}–${s.max}, média: ${s.avg}`;
  }

  return line;
}

function generateSchemaText(tableResults, unknownTables) {
  let output = `export const SCHEMA_CONTEXT = \`
Você é um assistente SQL especializado no banco de dados Medbrain.
Gere APENAS queries SELECT read-only baseadas no schema abaixo.

REGRAS OBRIGATÓRIAS:
1. Gere APENAS queries SELECT
2. NUNCA use WITH (CTEs)
3. NUNCA use funções pg_* (pg_read_file, pg_sleep, etc.)
4. NUNCA gere INSERT, UPDATE, DELETE, DROP, ALTER, CREATE
5. Use APENAS as tabelas/views listadas abaixo
6. Colunas com nomes especiais DEVEM usar "aspas duplas"
7. Se o usuário pedir algo que requer modificar dados, responda que o dashboard é read-only
8. NUNCA use id para ORDER BY ou paginação — use created_at
9. Use $1, $2, ... para parâmetros de data — NUNCA interpole datas na query
10. Retorne o resultado no formato JSON: { "sql": "...", "explanation": "...", "params": [] }
11. Limite resultados a 1000 linhas com LIMIT 1000

=== GUIA DE SELEÇÃO DE TABELAS ===
${FAQ_MAPPING}
=== SCHEMA DETALHADO (gerado automaticamente em ${new Date().toISOString().split('T')[0]}) ===

`;

  // Separate tables vs views
  const tableNames = [];
  const viewNames = [];

  for (const [name, data] of Object.entries(tableResults)) {
    if (data.error) continue;
    // Views typically start with vw_ or db_medbrain_ or poc_medbrain_first/last
    if (name.startsWith('vw_') || name.startsWith('db_medbrain_')) {
      viewNames.push(name);
    } else if (name === 'poc_medbrain_first_session' || name === 'poc_medbrain_last_session') {
      viewNames.push(name);
    } else {
      tableNames.push(name);
    }
  }

  // Tables
  output += 'TABELAS:\n\n';
  for (const name of tableNames) {
    const data = tableResults[name];
    const meta = TABLE_DESCRIPTIONS[name] || {};
    const sqlName = /[A-Z]/.test(name) ? `"${name}"` : name;

    output += `${sqlName}:\n`;
    if (meta.desc) output += `  DESCRIÇÃO: ${meta.desc}\n`;
    output += `  LINHAS: ~${data.rowCount.toLocaleString('pt-BR')}\n`;
    if (meta.usage) output += `  USAR PARA: ${meta.usage}\n`;
    if (meta.notes) output += `  NOTA: ${meta.notes}\n`;

    // Date ranges
    if (Object.keys(data.dateRanges).length > 0) {
      const ranges = Object.entries(data.dateRanges)
        .map(([col, r]) => `${col}: ${r.min} → ${r.max}`)
        .join(', ');
      output += `  PERÍODO: ${ranges}\n`;
    }

    output += '  COLUNAS:\n';
    for (const col of data.columns) {
      output += formatColumn(col, data.distinctValues, data.numStats) + '\n';
    }
    output += '\n';
  }

  // Views
  output += 'VIEWS:\n\n';
  for (const name of viewNames) {
    const data = tableResults[name];
    const meta = TABLE_DESCRIPTIONS[name] || {};

    output += `${name}:\n`;
    if (meta.desc) output += `  DESCRIÇÃO: ${meta.desc}\n`;
    output += `  LINHAS: ~${data.rowCount.toLocaleString('pt-BR')}\n`;
    if (meta.usage) output += `  USAR PARA: ${meta.usage}\n`;
    if (meta.notes) output += `  NOTA: ${meta.notes}\n`;

    if (Object.keys(data.dateRanges).length > 0) {
      const ranges = Object.entries(data.dateRanges)
        .map(([col, r]) => `${col}: ${r.min} → ${r.max}`)
        .join(', ');
      output += `  PERÍODO: ${ranges}\n`;
    }

    output += '  COLUNAS:\n';
    for (const col of data.columns) {
      output += formatColumn(col, data.distinctValues, data.numStats) + '\n';
    }
    output += '\n';
  }

  // Relationships
  output += `RELATIONSHIPS:
- survey_responses.conversation_id → poc_medbrain_wpp.id (avaliação → mensagem avaliada)
- survey_responses.session_id → users.phone (avaliação → usuário)
- referral_referred.referrer_id → referral_referrers.id (indicado → quem indicou)
- poc_medbrain_wpp.session_id = users.phone (mensagens → cadastro do usuário)

TIMEZONE: America/Sao_Paulo (usar AT TIME ZONE 'America/Sao_Paulo' quando agrupar por data)
\`;
`;

  // Report unknown tables
  if (unknownTables.length > 0) {
    console.log('\n⚠️  TABELAS/VIEWS NO BANCO NÃO INCLUÍDAS NO SCHEMA:');
    for (const t of unknownTables) {
      console.log(`   - ${t.table_name} (${t.table_type})`);
    }
    console.log('\n   Para incluí-las, adicione ao array TABLES neste script e');
    console.log('   ao ALLOWED_TABLES em src/lib/sql-validator.ts\n');
  }

  return output;
}

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrado. Defina em .env.local ou exporte no terminal.');
    console.error('   Exemplo: export DATABASE_URL="postgresql://user:pass@host:5432/db"');
    process.exit(1);
  }

  console.log('🔌 Conectando ao banco...');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 10000,
    ssl: process.env.DATABASE_CA
      ? { ca: process.env.DATABASE_CA, rejectUnauthorized: true }
      : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  console.log('✅ Conectado.\n');

  // Get known tables from the validator file
  let knownTableNames;
  try {
    const validatorContent = readFileSync(VALIDATOR_FILE, 'utf-8');
    const match = validatorContent.match(/ALLOWED_TABLES\s*=\s*\[([\s\S]*?)\]/);
    if (match) {
      knownTableNames = match[1]
        .split('\n')
        .map(l => l.trim().replace(/['"`,]/g, ''))
        .filter(l => l && !l.startsWith('//'));
    }
  } catch { /* skip */ }

  // Fallback list
  if (!knownTableNames || knownTableNames.length === 0) {
    knownTableNames = Object.keys(TABLE_DESCRIPTIONS);
  }

  console.log(`📊 Inspecionando ${knownTableNames.length} tabelas...\n`);

  const tableResults = {};
  for (const name of knownTableNames) {
    process.stdout.write(`  ${name}... `);
    try {
      tableResults[name] = await introspectTable(client, name);
      if (tableResults[name].error) {
        console.log(`❌ ${tableResults[name].error}`);
      } else {
        console.log(`✅ ${tableResults[name].rowCount.toLocaleString()} rows, ${tableResults[name].columns.length} cols`);
      }
    } catch (e) {
      tableResults[name] = { error: e.message };
      console.log(`❌ ${e.message}`);
    }
  }

  // Check for unknown tables
  const allTablesRes = await client.query(`
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  const unknownTables = allTablesRes.rows.filter(
    t => !knownTableNames.includes(t.table_name)
  );

  client.release();
  await pool.end();

  // Generate and write
  const schemaText = generateSchemaText(tableResults, unknownTables);
  writeFileSync(OUTPUT_FILE, schemaText, 'utf-8');
  console.log(`\n✅ Schema context atualizado em ${OUTPUT_FILE}`);
  console.log(`   ${Object.keys(tableResults).length} tabelas processadas.`);
}

main().catch(e => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
