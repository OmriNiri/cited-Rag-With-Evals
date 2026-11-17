import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AnswerService } from './answer.service.js';
import type { CitedAnswer } from './answer.types.js';
import { MAX_QUESTION_CHARS } from './answering.config.js';
import { AskController } from './ask.controller.js';
import { LlmError } from './llm-error.js';

// Real HTTP through Nest (routing, JSON body parsing, status codes, error
// mapping) with AnswerService replaced by a mock: no database, no model.
const answered: CitedAnswer = {
  refused: false,
  answer: 'One month.',
  citations: [
    {
      passage: 1,
      chunkId: 'co:art-335c:0',
      article: 'Art. 335c',
      quote: 'may be terminated at one month’s notice',
      valid: true,
    },
  ],
};

describe('POST /ask', () => {
  let app: INestApplication;
  const ask = vi.fn<(question: string) => Promise<CitedAnswer>>();

  beforeEach(async () => {
    ask.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [AskController],
      providers: [{ provide: AnswerService, useValue: { ask } }],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });
  afterEach(() => app.close());

  const post = (body: unknown) =>
    request(app.getHttpServer())
      .post('/ask')
      .send(body as object);

  it('returns 200 with the cited answer and passes the trimmed question on', async () => {
    ask.mockResolvedValue(answered);
    const res = await post({ question: '  What is the notice period?  ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(answered);
    expect(ask).toHaveBeenCalledWith('What is the notice period?');
  });

  it('returns a refusal as a normal 200 answer', async () => {
    const refusal: CitedAnswer = {
      refused: true,
      refusalReason: 'low_retrieval_score',
      answer: '',
      citations: [],
    };
    ask.mockResolvedValue(refusal);
    const res = await post({ question: 'How do I bake bread?' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(refusal);
  });

  it.each([
    ['no body', undefined],
    ['missing question', {}],
    ['empty question', { question: '   ' }],
    ['question is not a string', { question: 42 }],
  ])('returns 400 for %s, without calling the pipeline', async (_, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(ask).not.toHaveBeenCalled();
  });

  it('returns 400 for a question over the length limit', async () => {
    const res = await post({ question: 'a'.repeat(MAX_QUESTION_CHARS + 1) });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('too long');
  });

  it('returns 503 when the model is still unavailable after the retry', async () => {
    ask.mockRejectedValue(new LlmError('LLM unreachable', true));
    const res = await post({ question: 'What is the notice period?' });
    expect(res.status).toBe(503);
    // The internal reason stays in the server log, not in the response.
    expect(JSON.stringify(res.body)).not.toContain('unreachable');
  });

  it('returns 500 for any other failure (e.g. database down)', async () => {
    ask.mockRejectedValue(new Error('connection refused'));
    const res = await post({ question: 'What is the notice period?' });
    expect(res.status).toBe(500);
  });
});
