import { fakeHit } from '../../test/helpers/fake-retrieval.js';
import { FakeLlmClient, modelReply } from '../../test/helpers/fake-llm.js';
import type { Retriever, Retrievers } from '../retrieval/retriever.js';
import type { SearchHit } from '../retrieval/search.types.js';
import { AnswerService } from './answer.service.js';
import { MIN_TOP_SIMILARITY } from './answering.config.js';
import { LlmError } from './llm-error.js';

const NOTICE =
  '1 The employment relationship may be terminated at one month’s notice.';
const hybridHits: SearchHit[] = [
  { ...fakeHit('co:art-335c:0'), article: 'Art. 335c', text: NOTICE },
  {
    ...fakeHit('co:art-336c:0'),
    article: 'Art. 336c',
    text: 'Other text here.',
  },
];

/** Vector search returns one hit with the given similarity; hybrid returns hybridHits. */
function setup(topSimilarity: number | null, script: (string | Error)[]) {
  const stub = (hits: SearchHit[]): Retriever & { calls: number } => {
    const r = {
      mode: 'vector' as const,
      calls: 0,
      retrieve: () => {
        r.calls++;
        return Promise.resolve(hits);
      },
    };
    return r;
  };
  const vector = stub(
    topSimilarity === null ? [] : [fakeHit('v', topSimilarity)],
  );
  const hybrid = stub(hybridHits);
  const retrievers = { vector, keyword: stub([]), hybrid } as Retrievers;
  const llm = new FakeLlmClient(script);
  return { service: new AnswerService(retrievers, llm), llm, hybrid };
}

const cited = modelReply('One month.', [
  { passage: 1, quote: 'may be terminated at one month’s notice' },
]);

describe('AnswerService', () => {
  it('returns a cited answer whose citation points to the right chunk', async () => {
    const { service } = setup(0.7, [cited]);
    const result = await service.ask('What is the notice period?');
    expect(result).toMatchObject({ refused: false, answer: 'One month.' });
    expect(result.citations).toEqual([
      expect.objectContaining({ chunkId: 'co:art-335c:0', valid: true }),
    ]);
  });

  it('puts the hybrid passages and the question into the prompt', async () => {
    const { service, llm } = setup(0.7, [cited]);
    await service.ask('What is the notice period?');
    const userMessage = llm.requests[0].messages[1].content;
    expect(userMessage).toContain(`[1] Art. 335c`);
    expect(userMessage).toContain('Question: What is the notice period?');
  });

  it('gate 1: refuses a low-similarity question without calling the model', async () => {
    const { service, llm, hybrid } = setup(MIN_TOP_SIMILARITY - 0.01, [cited]);
    const result = await service.ask('How do I bake bread?');
    expect(result.refusalReason).toBe('low_retrieval_score');
    expect(llm.requests).toHaveLength(0);
    expect(hybrid.calls).toBe(0);
  });

  it('gate 1: refuses when nothing is indexed at all', async () => {
    const { service, llm } = setup(null, [cited]);
    expect((await service.ask('anything')).refusalReason).toBe(
      'low_retrieval_score',
    );
    expect(llm.requests).toHaveLength(0);
  });

  it('gate 2: passes on the model saying the passages are insufficient', async () => {
    const { service } = setup(0.5, [modelReply('', [], true)]);
    expect((await service.ask('q')).refusalReason).toBe(
      'model_insufficient_context',
    );
  });

  it('gate 3: refuses an answer whose quote is not in the passage', async () => {
    const invented = modelReply('Two months.', [
      { passage: 1, quote: 'may be terminated at two months’ notice' },
    ]);
    const { service } = setup(0.7, [invented]);
    const result = await service.ask('q');
    expect(result).toMatchObject({
      refused: true,
      refusalReason: 'no_valid_citation',
      answer: '',
    });
    expect(result.citations[0]).toMatchObject({ invalidReason: 'not_found' });
  });

  it('retries a failed model call once, then answers', async () => {
    const { service, llm } = setup(0.7, [new LlmError('timeout', true), cited]);
    expect((await service.ask('q')).refused).toBe(false);
    expect(llm.requests).toHaveLength(2);
  });

  it('throws when the model still fails after the retry', async () => {
    const { service } = setup(0.7, [
      new LlmError('down', true),
      new LlmError('still down', true),
    ]);
    await expect(service.ask('q')).rejects.toBeInstanceOf(LlmError);
  });
});
