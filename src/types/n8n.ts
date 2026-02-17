export interface N8NExecution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt: string | null;
  workflowId: string;
  status: 'success' | 'error' | 'waiting' | 'running';
}

export interface N8NExecutionDetail extends N8NExecution {
  data: {
    resultData: {
      error?: {
        message: string;
        stack?: string;
        node?: { name: string; type: string };
      };
      runData?: Record<string, unknown>;
    };
  };
}

export interface N8NError {
  executionId: string;
  startedAt: string;
  stoppedAt: string | null;
  nodeName: string | null;
  errorMessage: string;
  duration: number | null;
}

export interface N8NApiResponse {
  data: N8NExecution[];
  nextCursor?: string;
}
