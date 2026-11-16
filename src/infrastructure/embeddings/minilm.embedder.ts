import {
  pipeline,
  type FeatureExtractionPipeline,
} from '@huggingface/transformers';
import type { Embedder } from '../../ingestion/embedder.js';

// Runs locally via ONNX Runtime; downloaded once from Hugging Face, then cached (DECISIONS D3).
export const MINILM_MODEL = 'Xenova/all-MiniLM-L6-v2';

export class MiniLmEmbedder implements Embedder {
  readonly dimensions = 384;

  // Private: loading the model is async, and constructors cannot be. Use create().
  private constructor(private readonly extractor: FeatureExtractionPipeline) {}

  static async create(): Promise<MiniLmEmbedder> {
    // fp32 = full-precision weights. Same text in the same batch -> bit-identical vector.
    // Embedding a text inside a different batch can differ by ~1e-7 (padding changes
    // the floating-point order): measured, far too small to change any ranking.
    // (Quantised q8 would be smaller and faster but slightly less accurate.)
    const extractor = await pipeline('feature-extraction', MINILM_MODEL, {
      dtype: 'fp32',
    });
    return new MiniLmEmbedder(extractor);
  }

  countTokens(text: string): number {
    // Includes the [CLS] and [SEP] tokens the model adds, so it is the true input length.
    return this.extractor.tokenizer.encode(text).length;
  }

  async embed(texts: string[]): Promise<number[][]> {
    // The model outputs one vector per *token*. Mean pooling averages them into one
    // vector per text; normalize scales it to length 1, so cosine similarity is a
    // plain dot product. This is how all-MiniLM-L6-v2 was trained to be used.
    const output = await this.extractor(texts, {
      pooling: 'mean',
      normalize: true,
    });
    return output.tolist() as number[][];
  }
}
