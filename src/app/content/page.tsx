import { query } from '@/lib/db';
import { parsePeriodFromParams, toSPIsoString, STOPWORDS_PT, safeFormatDate } from '@/lib/utils';
import ChartWrapper from '@/components/charts/chart-wrapper';
import BarChartComponent from '@/components/charts/bar-chart';
import CategoryTreemap from '@/components/charts/category-treemap';
import StackedArea from '@/components/charts/stacked-area';
import WordCloud from '@/components/charts/word-cloud';
import Header from '@/components/layout/header';
import PeriodSelector from '@/components/layout/period-selector';

export const dynamic = 'force-dynamic';

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = parsePeriodFromParams(params);
  const fromStr = toSPIsoString(from);
  const toStr = toSPIsoString(to);

  const [topCats, treemapData, questionsRaw] = await Promise.all([
    query('SELECT categoria, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE categoria IS NOT NULL AND created_at BETWEEN $1 AND $2 GROUP BY categoria ORDER BY total DESC LIMIT 15', [fromStr, toStr]),
    query('SELECT categoria, subcategoria, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE categoria IS NOT NULL AND subcategoria IS NOT NULL AND created_at BETWEEN $1 AND $2 GROUP BY categoria, subcategoria ORDER BY total DESC', [fromStr, toStr]),
    query('SELECT "Pergunta_do_aluno" FROM poc_medbrain_wpp WHERE "Pergunta_do_aluno" IS NOT NULL AND created_at BETWEEN $1 AND $2 LIMIT 2000', [fromStr, toStr]),
  ]);

  // Top 5 categories temporal (2 sequential queries as per spec)
  const top5Cats = await query('SELECT categoria FROM poc_medbrain_wpp WHERE created_at BETWEEN $1 AND $2 AND categoria IS NOT NULL GROUP BY categoria ORDER BY COUNT(*) DESC LIMIT 5', [fromStr, toStr]);
  const top5Names = top5Cats.map(r => String(r.categoria));

  let temporalData: Record<string, unknown>[] = [];
  if (top5Names.length > 0) {
    const temporal = await query(
      `SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as dia, categoria, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE categoria = ANY($3) AND created_at BETWEEN $1 AND $2 GROUP BY dia, categoria ORDER BY dia`,
      [fromStr, toStr, top5Names]
    );
    // Pivot data for stacked area
    const daysMap = new Map<string, Record<string, unknown>>();
    temporal.forEach(r => {
      const dia = safeFormatDate(r.dia);
      if (!daysMap.has(dia)) daysMap.set(dia, { dia });
      daysMap.get(dia)![String(r.categoria)] = Number(r.total);
    });
    temporalData = Array.from(daysMap.values()).sort((a, b) => String(a.dia).localeCompare(String(b.dia)));
  }

  // Build treemap data
  const catMap = new Map<string, { name: string; children: { name: string; value: number }[] }>();
  treemapData.forEach(r => {
    const cat = String(r.categoria);
    if (!catMap.has(cat)) catMap.set(cat, { name: cat, children: [] });
    catMap.get(cat)!.children.push({ name: String(r.subcategoria), value: Number(r.total) });
  });
  const treemapRoot = { name: 'Categorias', children: Array.from(catMap.values()) };

  // Word cloud processing
  const wordFreq = new Map<string, number>();
  questionsRaw.forEach(r => {
    const text = String(r.Pergunta_do_aluno || '').toLowerCase();
    text.split(/\s+/).forEach(word => {
      const clean = word.replace(/[^a-záàâãéèêíïóôõúüç]/g, '');
      if (clean.length > 2 && !STOPWORDS_PT.has(clean)) {
        wordFreq.set(clean, (wordFreq.get(clean) || 0) + 1);
      }
    });
  });
  const words = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([text, value]) => ({ text, value }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const areas = top5Names.map((name, i) => ({ key: name, color: COLORS[i % COLORS.length], name }));

  return (
    <div>
      <Header title="Conteúdo & Categorias" />
      <div className="p-6 space-y-6">
        <PeriodSelector />
        <ChartWrapper title="Top 15 Categorias" description="As 15 categorias médicas mais consultadas no período" chartId="content-top">
          <BarChartComponent data={topCats.map(r => ({ categoria: String(r.categoria), total: Number(r.total) }))} xKey="categoria" yKey="total" horizontal xLabel="Total" />
        </ChartWrapper>

        <ChartWrapper title="Drill-Down Subcategorias" description="Treemap interativo: clique em uma categoria para ver suas subcategorias" chartId="content-treemap">
          <CategoryTreemap data={treemapRoot} />
        </ChartWrapper>

        {temporalData.length > 0 && (
          <ChartWrapper title="Evolução Temporal (Top 5)" description="Evolução diária das 5 categorias mais consultadas" chartId="content-temporal">
            <StackedArea data={temporalData} xKey="dia" areas={areas} xLabel="Data" yLabel="Mensagens" />
          </ChartWrapper>
        )}

        <ChartWrapper title="Nuvem de Palavras" description="Palavras mais frequentes nas perguntas dos usuários (stopwords removidas)" chartId="content-wordcloud">
          <WordCloud words={words} />
        </ChartWrapper>
      </div>
    </div>
  );
}
