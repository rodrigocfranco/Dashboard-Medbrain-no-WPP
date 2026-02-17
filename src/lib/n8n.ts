import type { N8NExecution, N8NApiResponse, N8NExecutionDetail, N8NError } from '@/types/n8n';

const WORKFLOW_ID = '7tp9fz1NxbfamadU';

async function fetchN8N(path: string): Promise<Response> {
  const baseUrl = process.env.N8N_API_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('N8N_API_URL or N8N_API_KEY not configured');
  }

  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'X-N8N-API-KEY': apiKey },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`N8N API error: ${res.status} ${res.statusText}`);
  }

  return res;
}

export async function getExecutions(
  status?: 'error' | 'success',
  limit = 250
): Promise<N8NExecution[]> {
  const params = new URLSearchParams({
    workflowId: WORKFLOW_ID,
    limit: String(limit),
  });
  if (status) params.set('status', status);

  const res = await fetchN8N(`/executions?${params}`);
  const data: N8NApiResponse = await res.json();
  return data.data;
}

export async function getExecutionDetail(id: string): Promise<N8NExecutionDetail> {
  const res = await fetchN8N(`/executions/${encodeURIComponent(id)}`);
  return res.json();
}

export function parseErrors(executions: N8NExecution[]): N8NError[] {
  return executions
    .filter((e) => e.status === 'error')
    .map((e) => ({
      executionId: e.id,
      startedAt: e.startedAt,
      stoppedAt: e.stoppedAt,
      nodeName: null, // Requires detail fetch
      errorMessage: 'Error in execution',
      duration: e.stoppedAt
        ? (new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime()) / 1000
        : null,
    }));
}
