import { chunkId } from './chunk-id.js';

describe('chunkId', () => {
  it('builds a readable id from document, article and part', () => {
    expect(chunkId('co-iec', 'Art. 335c', 0)).toBe('co-iec:art-335c:0');
  });

  it('is deterministic', () => {
    expect(chunkId('d', 'Art. 319', 2)).toBe(chunkId('d', 'Art. 319', 2));
  });
});
