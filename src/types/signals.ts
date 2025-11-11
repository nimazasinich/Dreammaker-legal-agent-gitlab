export type Action = 'BUY' | 'SELL' | 'HOLD';

export type Bar = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type CoreSignal = {
  action: Action;
  strength: number;       // 0.1..1
  confidence: number;     // 0.1..0.95
  score: number;          // normalized 0..1 (currently same as confidence)
  reasons: string[];      // ≤5
};

export type LayerScore = {
  score: number;          // 0..1
  reasons: string[];      // ≤3 typically
};

export type PatternScores = {
  elliott: LayerScore;
  harmonic: LayerScore;
  classical: LayerScore;
  combined: LayerScore;   // weighted combination
};

export type AuxScores = {
  fibonacci: LayerScore;
  sar: LayerScore;
  rpercent: LayerScore;
};

export type SentimentScores = {
  sentiment: LayerScore;
  news: LayerScore;
  whales: LayerScore;
  combined: LayerScore;   // internal weighting
};

export type MLScore = LayerScore;

export type FinalDecision = {
  action: Action;
  score: number;          // 0..1 (final aggregated score)
  confidence: number;     // 0..1 (confidence in the decision)
  finalScore?: number;    // DEPRECATED: use 'score' instead
  components: {
    core: CoreSignal;
    smc: LayerScore;
    patterns: PatternScores;
    sentiment: SentimentScores;
    ml: MLScore;
    aux: AuxScores;       // auxiliary contributions (non-weighted in final unless mapped)
  };
};
