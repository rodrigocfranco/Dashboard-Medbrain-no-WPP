import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { SCHEMA_CONTEXT } from './schema-context';

export class AIUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIUnavailableError';
  }
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SQLResult {
  sql: string;
  explanation: string;
  params: unknown[];
}

function parseAIResponse(text: string): SQLResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*"sql"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        sql: parsed.sql || '',
        explanation: parsed.explanation || '',
        params: parsed.params || [],
      };
    }
  } catch {
    // Fall through to manual extraction
  }

  // Manual extraction from code blocks
  const sqlMatch = text.match(/```sql\n?([\s\S]*?)```/);
  const sql = sqlMatch ? sqlMatch[1].trim() : '';
  const explanation = text
    .replace(/```[\s\S]*?```/g, '')
    .trim()
    .slice(0, 500);

  return { sql, explanation, params: [] };
}

async function callGPT4o(
  systemPrompt: string,
  userMessage: string,
  history: AIMessage[]
): Promise<SQLResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(
      (m) =>
        ({
          role: m.role,
          content: m.content,
        }) as OpenAI.ChatCompletionMessageParam
    ),
    { role: 'user', content: userMessage },
  ];

  const response = await openai.chat.completions.create(
    {
      model: 'gpt-4o',
      messages,
      temperature: 0,
      max_tokens: 2000,
    },
    { timeout: 30000 }
  );

  const text = response.choices[0]?.message?.content || '';
  console.log('[AI] GPT-4o responded successfully');
  return parseAIResponse(text);
}

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  history: AIMessage[]
): Promise<SQLResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const messages: Anthropic.MessageParam[] = [
    ...history.map(
      (m) =>
        ({
          role: m.role,
          content: m.content,
        }) as Anthropic.MessageParam
    ),
    { role: 'user', content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    system: systemPrompt,
    messages,
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';
  console.log('[AI] Claude responded successfully');
  return parseAIResponse(text);
}

export async function generateSQL(
  message: string,
  history: AIMessage[] = []
): Promise<SQLResult> {
  const systemPrompt = SCHEMA_CONTEXT;

  try {
    return await callGPT4o(systemPrompt, message, history);
  } catch (gptError) {
    console.warn('GPT-4o failed, falling back to Claude:', gptError);
    try {
      return await callClaude(systemPrompt, message, history);
    } catch (claudeError) {
      console.error('Both AI providers failed:', claudeError);
      throw new AIUnavailableError(
        'Assistente temporariamente indisponível. Tente novamente em alguns segundos.'
      );
    }
  }
}
