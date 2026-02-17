import { query } from '@/lib/db';
import { parsePeriodFromParams, toSPIsoString } from '@/lib/utils';
import { mapCategoryToGA } from '@/lib/category-ga-map';
import ChartWrapper from '@/components/charts/chart-wrapper';
import BarChartComponent from '@/components/charts/bar-chart';
import Histogram from '@/components/charts/histogram';
import ScatterPlot from '@/components/charts/scatter-plot';
import DataTable from '@/components/ui/data-table';
import Header from '@/components/layout/header';
import PeriodSelector from '@/components/layout/period-selector';

export const dynamic = 'force-dynamic';

export default async function RAGPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { from, to } = parsePeriodFromParams(params);
  const fromStr = toSPIsoString(from);
  const toStr = toSPIsoString(to);

  const [gaData, chunksData, focosData, dicasData, demandData, ofertaData] =
    await Promise.all([
      query(
        'SELECT ga, COUNT(DISTINCT file_id)::int as docs, SUM(approx_tokens)::int as total_tokens FROM medway_vs WHERE ga IS NOT NULL GROUP BY ga ORDER BY docs DESC'
      ),
      query(
        'SELECT total_chunks, COUNT(DISTINCT file_id)::int as docs FROM medway_vs GROUP BY total_chunks ORDER BY total_chunks'
      ),
      query(
        'SELECT ga, tema, foco, cfa FROM indice_focos ORDER BY ga, tema, foco'
      ),
      query(
        `SELECT "Created_at", "GA", "Tema", "Foco", LEFT("AI_Answer", 200) as preview FROM "Dica_personalizada" ORDER BY "Created_at" DESC LIMIT 100`
      ),
      query(
        'SELECT categoria, COUNT(*)::int as total FROM poc_medbrain_wpp WHERE categoria IS NOT NULL AND created_at BETWEEN $1 AND $2 GROUP BY categoria',
        [fromStr, toStr]
      ),
      query(
        'SELECT ga, COUNT(DISTINCT file_id)::int as docs FROM medway_vs GROUP BY ga'
      ),
    ]);

  // Demand x Supply scatter
  const ofertaMap = new Map(
    ofertaData.map((r) => [String(r.ga), Number(r.docs)])
  );
  const scatterPoints: { x: number; y: number; label: string }[] = [];
  const unmapped: string[] = [];

  demandData.forEach((r) => {
    const cat = String(r.categoria);
    const ga = mapCategoryToGA(cat);
    if (ga) {
      const docs = ofertaMap.get(ga) || 0;
      scatterPoints.push({ x: Number(r.total), y: docs, label: cat });
    } else {
      unmapped.push(cat);
    }
  });

  return (
    <div>
      <Header title="Base de Conhecimento RAG" />
      <div className="p-6 space-y-6">
        <PeriodSelector />

        <ChartWrapper
          title="Cobertura por GA"
          description="Cobertura da base RAG por Grande Área (GA): documentos e tokens por área"
          chartId="rag-ga"
        >
          <BarChartComponent
            data={gaData.map((r) => ({
              ga: String(r.ga),
              docs: Number(r.docs),
            }))}
            xKey="ga"
            yKey="docs"
            horizontal
            xLabel="Documentos"
          />
        </ChartWrapper>

        <ChartWrapper
          title="Distribuição de Chunks"
          description="Distribuição do número de chunks por documento na base RAG"
          chartId="rag-chunks"
        >
          <Histogram
            data={chunksData.map((r) => ({
              faixa: String(r.total_chunks),
              total: Number(r.docs),
            }))}
            xLabel="Chunks" yLabel="Documentos"
          />
        </ChartWrapper>

        <ChartWrapper
          title="Cruzamento Demanda x Oferta"
          description="Cruzamento entre demanda (conversas) e oferta (documentos RAG). Quadrante superior-esquerdo = gaps de conteúdo prioritários."
          chartId="rag-demand-supply"
        >
          <ScatterPlot
            data={scatterPoints}
            xLabel="Conversas (demanda)"
            yLabel="Documentos RAG (oferta)"
          />
          {unmapped.length > 0 && (
            <div className="mt-3 text-xs text-gray-500">
              <p className="font-medium mb-1">
                Sem correspondência no RAG ({unmapped.length}):
              </p>
              <p>{unmapped.join(', ')}</p>
            </div>
          )}
        </ChartWrapper>

        <ChartWrapper
          title="Focos & CFAs"
          description="Índice de focos com GA, Tema, Foco e CFA"
          chartId="rag-focos"
        >
          <DataTable
            data={focosData as Record<string, unknown>[]}
            columns={[
              { key: 'ga', label: 'GA', sortable: true },
              { key: 'tema', label: 'Tema', sortable: true },
              { key: 'foco', label: 'Foco', sortable: true },
              { key: 'cfa', label: 'CFA', sortable: true },
            ]}
            searchable
            searchPlaceholder="Buscar por GA, tema ou foco..."
          />
        </ChartWrapper>

        <ChartWrapper
          title="Dicas Personalizadas"
          description="Últimas dicas geradas pela IA"
          chartId="rag-dicas"
        >
          <DataTable
            data={dicasData as Record<string, unknown>[]}
            columns={[
              { key: 'Created_at', label: 'Data', sortable: true },
              { key: 'GA', label: 'GA', sortable: true },
              { key: 'Tema', label: 'Tema', sortable: true },
              { key: 'Foco', label: 'Foco' },
              { key: 'preview', label: 'Resposta IA' },
            ]}
          />
        </ChartWrapper>
      </div>
    </div>
  );
}
