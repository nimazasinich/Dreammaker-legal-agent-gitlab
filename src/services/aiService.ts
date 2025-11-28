import { TradingDecision, TrainingMetrics, MarketData, AIConfig } from '../types';

import { Logger } from '../core/Logger.js';
interface Experience {
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
  priority: number;
  timestamp: Date;
  tdError?: number;
  importanceSamplingWeight?: number;
}

interface NeuralNetworkConfig {
  inputSize: number;
  hiddenLayers: number[];
  outputSize: number;
  activationType: 'leaky_relu' | 'sigmoid' | 'tanh';
  initializationType: 'xavier' | 'he';
  seed: number;
}

interface TrainingConfig {
  batchSize: number;
  epochs: number;
  learningRate: number;
  validationSplit: number;
  earlyStopping: {
    patience: number;
    minDelta: number;
  };
}

interface ModelPerformanceMetrics {
  accuracy: number;
  loss: number;
  explorationRate: number;
  experienceBufferSize: number;
  resetCount: number;
  latency: number;
  memoryUsage: number;
}

interface TrainingStatus {
  isTraining: boolean;
  currentEpoch: number;
  totalEpochs: number;
  currentLoss: number;
  learningRate: number;
  validationLoss: number;
  bestLoss: number;
}

class NeuralNetwork {
  private readonly logger = Logger.getInstance();
  private weights: number[][];
  private biases: number[][];
  private config: NeuralNetworkConfig;
  private optimizer: AdamWOptimizer;
  private bestWeights: number[][] | null = null;
  private bestBiases: number[][] | null = null;
  private bestLoss = Infinity;
  private resetCount = 0;
  private seed: number;
  private rng: () => number;

  constructor(config: NeuralNetworkConfig) {
    this.config = config;
    this.seed = config.seed || 42;
    this.rng = this.createSeededRNG(this.seed);
    this.initializeNetwork();
    this.optimizer = new AdamWOptimizer({
      learningRate: 0.001,
      beta1: 0.9,
      beta2: 0.999,
      weightDecay: 0.01
    });
  }

  private createSeededRNG(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  private initializeNetwork(): void {
    this.weights = [];
    this.biases = [];
    
    const layers = [this.config.inputSize, ...this.config.hiddenLayers, this.config.outputSize];
    
    for (let i = 0; i < layers.length - 1; i++) {
      const fanIn = layers[i];
      const fanOut = layers[i + 1];
      
      let scale: number;
      if (this.config.initializationType === 'xavier') {
        scale = Math.sqrt(6.0 / (fanIn + fanOut));
      } else {
        scale = Math.sqrt(2.0 / fanIn);
      }
      
      const layerWeights: number[] = [];
      for (let j = 0; j < fanIn * fanOut; j++) {
        layerWeights.push((this.rng() - 0.5) * 2 * scale);
      }
      this.weights.push(layerWeights);
      
      const layerBiases: number[] = new Array(fanOut).fill(0);
      this.biases.push(layerBiases);
    }
  }

  private stableActivation(x: number, type: string): number {
    const clipped = Math.max(-50, Math.min(50, x));
    
    let result: number;
    switch (type) {
      case 'leaky_relu':
        result = clipped > 0 ? clipped : clipped * 0.01;
        break;
      case 'sigmoid':
        result = 1 / (1 + Math.exp(-clipped));
        break;
      case 'tanh':
        result = Math.tanh(clipped);
        break;
      default:
        result = clipped;
    }
    
    return Math.max(-50, Math.min(50, result));
  }

  forward(inputs: number[]): number[] {
    let current = [...inputs];
    const layers = [this.config.inputSize, ...this.config.hiddenLayers, this.config.outputSize];
    
    for (let layer = 0; layer < this.weights.length; layer++) {
      const nextSize = layers[layer + 1];
      const nextLayer: number[] = [];
      
      for (let i = 0; i < nextSize; i++) {
        let sum = this.biases[layer][i];
        for (let j = 0; j < current.length; j++) {
          const weightIndex = i * current.length + j;
          sum += current[j] * this.weights[layer][weightIndex];
        }
        
        const activation = layer === this.weights.length - 1 ? 'sigmoid' : this.config.activationType;
        nextLayer.push(this.stableActivation(sum, activation));
      }
      
      current = nextLayer;
    }
    
    return current;
  }

  train(inputs: number[][], targets: number[][], config: TrainingConfig): TrainingMetrics {
    const validationSize = Math.floor(inputs.length * config.validationSplit);
    const trainInputs = inputs.slice(validationSize);
    const trainTargets = targets.slice(validationSize);
    const valInputs = inputs.slice(0, validationSize);
    const valTargets = targets.slice(0, validationSize);

    const bestValLoss = Infinity;
    let patience = 0;
    let totalLoss = 0;
    let totalMae = 0;
    let correctPredictions = 0;

    for (let epoch = 0; epoch < config.epochs; epoch++) {
      const indices = Array.from({ length: trainInputs.length }, (_, i) => i);
      this.shuffleArray(indices);

      let epochLoss = 0;
      let epochMae = 0;
      let epochCorrect = 0;

      for (let i = 0; i < trainInputs.length; i += config.batchSize) {
        const batchEnd = Math.min(i + config.batchSize, trainInputs.length);
        const batchInputs = indices.slice(i, batchEnd).map(idx => trainInputs[idx]);
        const batchTargets = indices.slice(i, batchEnd).map(idx => trainTargets[idx]);

        const { loss, mae, correct } = this.trainBatch(batchInputs, batchTargets);
        epochLoss += loss;
        epochMae += mae;
        epochCorrect += correct;
      }

      epochLoss /= trainInputs.length;
      epochMae /= trainInputs.length;
      const epochAccuracy = epochCorrect / trainInputs.length;

      const valLoss = this.validateModel(valInputs, valTargets);

      if (!isFinite(epochLoss) || !isFinite(valLoss) || epochLoss > this.bestLoss * 3) {
        this.logger.warn('Training instability detected, resetting...');
        this.resetToStableState();
        this.resetCount++;
        continue;
      }

      if (valLoss < this.bestLoss) {
        this.bestLoss = valLoss;
        this.saveCheckpoint();
        patience = 0;
      } else {
        patience++;
      }

      if (patience >= config.earlyStopping.patience) {
        this.logger.info(`Early stopping at epoch ${epoch}`);
        break;
      }

      totalLoss = epochLoss;
      totalMae = epochMae;
      correctPredictions = epochCorrect;
    }

    const r2 = Math.max(0, 1 - totalLoss);

    return {
      modelVersion: '1.0.0',
      epoch: config.epochs,
      mse: totalLoss,
      mae: totalMae,
      r2,
      directionalAccuracy: correctPredictions / trainInputs.length,
      learningRate: this.optimizer.learningRate,
      resetEvents: this.resetCount,
      seed: this.seed,
      timestamp: Date.now()
    } as TrainingMetrics;
  }

  private trainBatch(inputs: number[][], targets: number[][]): { loss: number; mae: number; correct: number } {
    let totalLoss = 0;
    let totalMae = 0;
    let correct = 0;

    const gradients: number[][][] = (this.weights || []).map(layer => 
      Array(layer.length).fill(0).map(() => [])
    );

    for (let i = 0; i < inputs.length; i++) {
      const prediction = this.forward(inputs[i]);
      const target = targets[i];

      const loss = target.reduce((sum, t, idx) => sum + Math.pow(t - prediction[idx], 2), 0) / target.length;
      totalLoss += loss;

      const mae = target.reduce((sum, t, idx) => sum + Math.abs(t - prediction[idx]), 0) / target.length;
      totalMae += mae;

      const predictedDirection = prediction[0] > prediction[1] ? 1 : -1;
      const actualDirection = target[0] > target[1] ? 1 : -1;
      if (predictedDirection === actualDirection) correct++;

      for (let j = 0; j < prediction.length; j++) {
        const error = 2 * (prediction[j] - target[j]) / target.length;
        if (!gradients[this.weights.length - 1][j]) {
          gradients[this.weights.length - 1][j] = [];
        }
        gradients[this.weights.length - 1][j].push(error);
      }
    }

    this.applyGradients(gradients);

    return {
      loss: totalLoss / inputs.length,
      mae: totalMae / inputs.length,
      correct
    };
  }

  private applyGradients(gradients: number[][][]): void {
    let globalNorm = 0;
    for (const layerGrads of gradients) {
      for (const neuronGrads of layerGrads) {
        for (const grad of neuronGrads) {
          globalNorm += grad * grad;
        }
      }
    }
    globalNorm = Math.sqrt(globalNorm);

    const clipNorm = 1.0;
    const scale = globalNorm > clipNorm ? clipNorm / globalNorm : 1.0;

    for (let layer = 0; layer < gradients.length; layer++) {
      for (let neuron = 0; neuron < gradients[layer].length; neuron++) {
        if (gradients[layer][neuron].length > 0) {
          const avgGrad = gradients[layer][neuron].reduce((sum, g) => sum + g, 0) / gradients[layer][neuron].length;
          const clippedGrad = avgGrad * scale;
          
          this.optimizer.update(layer, neuron, clippedGrad);
        }
      }
    }
  }

  private validateModel(inputs: number[][], targets: number[][]): number {
    let totalLoss = 0;
    
    for (let i = 0; i < inputs.length; i++) {
      const prediction = this.forward(inputs[i]);
      const target = targets[i];
      const loss = target.reduce((sum, t, idx) => sum + Math.pow(t - prediction[idx], 2), 0) / target.length;
      totalLoss += loss;
    }
    
    return totalLoss / inputs.length;
  }

  private saveCheckpoint(): void {
    this.bestWeights = (this.weights || []).map(layer => [...layer]);
    this.bestBiases = (this.biases || []).map(layer => [...layer]);
  }

  private resetToStableState(): void {
    if (this.bestWeights && this.bestBiases) {
      this.weights = (this.bestWeights || []).map(layer => [...layer]);
      this.biases = (this.bestBiases || []).map(layer => [...layer]);
    } else {
      this.initializeNetwork();
    }
    
    this.optimizer.learningRate *= 0.25;
  }

  private shuffleArray(array: number[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

class AdamWOptimizer {
  public learningRate: number;
  private beta1: number;
  private beta2: number;
  private weightDecay: number;
  private m: Map<string, number> = new Map();
  private v: Map<string, number> = new Map();
  private t = 0;

  constructor(config: { learningRate: number; beta1: number; beta2: number; weightDecay: number }) {
    this.learningRate = config.learningRate;
    this.beta1 = config.beta1;
    this.beta2 = config.beta2;
    this.weightDecay = config.weightDecay;
  }

  update(layer: number, neuron: number, gradient: number): void {
    this.t++;
    const key = `${layer}_${neuron}`;
    
    const m = this.m.get(key) || 0;
    const v = this.v.get(key) || 0;
    
    const newM = this.beta1 * m + (1 - this.beta1) * gradient;
    const newV = this.beta2 * v + (1 - this.beta2) * gradient * gradient;
    
    this.m.set(key, newM);
    this.v.set(key, newV);
    
    const mHat = newM / (1 - Math.pow(this.beta1, this.t));
    const vHat = newV / (1 - Math.pow(this.beta2, this.t));
    
    const update = this.learningRate * (mHat / (Math.sqrt(vHat) + 1e-8) + this.weightDecay);
  }
}

class ExperienceReplay {
  private buffer: Experience[] = [];
  private capacity: number;
  private position = 0;
  private alpha = 0.6;
  private beta = 0.4;
  private betaIncrement = 0.001;

  constructor(capacity: number = 200000) {
    this.capacity = capacity;
  }

  store(experience: Experience): void {
    if (this.buffer.length < this.capacity) {
      this.buffer.push(experience);
    } else {
      this.buffer[this.position] = experience;
    }
    this.position = (this.position + 1) % this.capacity;
  }

  sample(batchSize: number): Experience[] {
    if (this.buffer.length < batchSize) {
      return [...this.buffer];
    }

    const priorities = (this.buffer || []).map(exp => Math.pow(exp.priority + 1e-6, this.alpha));
    const totalPriority = priorities.reduce((sum, p) => sum + p, 0);
    
    const samples: Experience[] = [];
    const maxWeight = Math.max(...(priorities || []).map(p => Math.pow(p / totalPriority, -this.beta)));

    for (let i = 0; i < batchSize; i++) {
      let randomValue = Math.random() * totalPriority;
      let selectedIndex = 0;

      for (let j = 0; j < priorities.length; j++) {
        randomValue -= priorities[j];
        if (randomValue <= 0) {
          selectedIndex = j;
          break;
        }
      }

      const experience = { ...this.buffer[selectedIndex] };
      const weight = Math.pow(priorities[selectedIndex] / totalPriority, -this.beta);
      experience.importanceSamplingWeight = weight / maxWeight;
      
      samples.push(experience);
    }

    this.beta = Math.min(1.0, this.beta + this.betaIncrement);
    return samples;
  }

  updatePriorities(indices: number[], tdErrors: number[]): void {
    for (let i = 0; i < indices.length; i++) {
      if (indices[i] < this.buffer.length) {
        this.buffer[indices[i]].priority = Math.abs(tdErrors[i]) + 1e-6;
        this.buffer[indices[i]].tdError = tdErrors[i];
      }
    }
  }

  size(): number {
    return this.buffer.length;
  }
}

export class AIService {
  private readonly logger = Logger.getInstance();

  private network: NeuralNetwork;
  private experienceReplay: ExperienceReplay;
  private config: AIConfig;
  private trainingMetrics: TrainingMetrics[] = [];
  private explorationRate = 0.2;
  private explorationDecay = 0.9999;
  private minExplorationRate = 0.02;
  private isTraining = false;
  private currentEpoch = 0;
  private totalEpochs = 0;
  private currentLoss = 0;
  private validationLoss = 0;
  private bestLoss = Infinity;

  constructor() {
    this.config = {
      initializer: { type: 'xavier', mode: 'uniform', gain: 1.0 },
      activations: { preClip: 50.0, postClip: 50.0, leakySlope: 0.01 },
      optimizer: { type: 'adamw', lr: 0.001, beta1: 0.9, beta2: 0.999, weightDecay: 0.01 },
      stability: {
        clip: { useGlobalNorm: true, maxNorm: 1.0 },
        instability: { spikeFactor: 3.0, gradientSpikeFactor: 2.5, nanReset: true, lrDecayOnReset: 0.25 }
      },
      replay: { enabled: true, capacity: 200000, batchSize: 512, prioritized: true },
      exploration: { mode: 'epsilon', start: 0.2, end: 0.02, decaySteps: 50000 },
      thresholds: { enterLong: 0.6, enterShort: 0.6, abstain: 0.5 }
    };

    this.initializeNetwork();
    this.experienceReplay = new ExperienceReplay(this.config.replay.capacity);
  }

  private initializeNetwork(): void {
    const networkConfig: NeuralNetworkConfig = {
      inputSize: 20,
      hiddenLayers: [64, 32, 16],
      outputSize: 3,
      activationType: 'leaky_relu',
      initializationType: 'xavier',
      seed: 42
    };

    this.network = new NeuralNetwork(networkConfig);
  }

  async trainModel(data: MarketData[]): Promise<TrainingMetrics> {
    // Validate data availability
    if (!data || !Array.isArray(data)) {
      this.logger.error('AI_TRAINING_INVALID_INPUT', { 
        error: 'Invalid data input', 
        dataType: typeof data 
      });
      return this.getDefaultTrainingMetrics('INVALID_INPUT');
    }

    // Check for insufficient data
    if (data.length < 50) {
      this.logger.error('AI_DATA_TOO_SMALL', { 
        error: 'Insufficient data for training',
        available: data.length,
        required: 50,
        suggestion: 'Fetch more historical data before training'
      });
      return this.getDefaultTrainingMetrics('INSUFFICIENT_DATA');
    }

    this.isTraining = true;
    this.currentEpoch = 0;
    this.totalEpochs = 100;

    try {
      const features = this.extractFeatures(data);
      if (!features || features.length === 0) {
        this.logger.error('AI_FEATURE_EXTRACTION_FAILED', { 
          error: 'Feature extraction returned no features' 
        });
        return this.getDefaultTrainingMetrics('FEATURE_EXTRACTION_FAILED');
      }

      const targets = this.createTargets(data);
      if (!targets || targets.length === 0) {
        this.logger.error('AI_TARGET_CREATION_FAILED', { 
          error: 'Target creation returned no targets' 
        });
        return this.getDefaultTrainingMetrics('TARGET_CREATION_FAILED');
      }

      const normalizedTargets = this.normalizeTargets(targets);

      const trainingConfig: TrainingConfig = {
        batchSize: this.config.replay.batchSize,
        epochs: this.totalEpochs,
        learningRate: this.config.optimizer.lr,
        validationSplit: 0.2,
        earlyStopping: {
          patience: 10,
          minDelta: 1e-4
        }
      };

      const metrics = this.network.train(features, normalizedTargets, trainingConfig);
      
      // Validate metrics
      if (!metrics || !this.validateTrainingMetrics(metrics)) {
        this.logger.error('AI_TRAINING_INVALID_METRICS', { 
          error: 'Training returned invalid metrics',
          metrics 
        });
        return this.getDefaultTrainingMetrics('INVALID_METRICS');
      }

      this.trainingMetrics.push(metrics);

      this.explorationRate = Math.max(
        this.minExplorationRate,
        this.explorationRate * this.explorationDecay
      );

      this.logger.info('AI_TRAINING_SUCCESS', { 
        epochs: metrics.epoch,
        mse: metrics.mse,
        r2: metrics.r2 
      });

      return metrics;
    } catch (error: any) {
      this.logger.error('AI_TRAINING_ERROR', { 
        error: error.message,
        stack: error.stack 
      }, error);
      return this.getDefaultTrainingMetrics('TRAINING_ERROR');
    } finally {
      this.isTraining = false;
    }
  }

  async predict(data: MarketData[]): Promise<TradingDecision> {
    // Validate input data
    if (!data || !Array.isArray(data)) {
      this.logger.error('AI_PREDICTION_INVALID_INPUT', { 
        error: 'Invalid data input',
        dataType: typeof data 
      });
      return this.getDefaultDecision('AI_PREDICTION_INVALID_INPUT');
    }

    if (data.length === 0) {
      this.logger.warn('AI_DATA_TOO_SMALL', { 
        error: 'No data available for prediction',
        suggestion: 'Fetch market data before requesting prediction' 
      });
      return this.getDefaultDecision('AI_DATA_TOO_SMALL');
    }

    try {
      const features = this.extractFeatures(data.slice(-1));
      if (!features || features.length === 0) {
        this.logger.error('AI_FEATURE_EXTRACTION_FAILED', { 
          error: 'Feature extraction failed',
          dataLength: data.length 
        });
        return this.getDefaultDecision('AI_FEATURE_EXTRACTION_FAILED');
      }

      const predictions: number[][] = [];
      const numSamples = 20;

      for (let i = 0; i < numSamples; i++) {
        const prediction = this.network.forward(features[0]);
        predictions.push(prediction);
      }

      const meanPrediction = predictions[0].map((_, idx) => 
        predictions.reduce((sum, pred) => sum + pred[idx], 0) / predictions.length
      );

      const uncertainty = predictions[0].map((_, idx) => {
        const mean = meanPrediction[idx];
        const variance = predictions.reduce((sum, pred) => sum + Math.pow(pred[idx] - mean, 2), 0) / predictions.length;
        return Math.sqrt(variance);
      });

      const maxPred = Math.max(...meanPrediction);
      const expPreds = (meanPrediction || []).map(p => Math.exp(p - maxPred));
      const sumExp = expPreds.reduce((sum, exp) => sum + exp, 0);
      const probabilities = (expPreds || []).map(exp => exp / sumExp);

      const [bullProb, bearProb, neutralProb] = probabilities;
      const confidence = Math.max(...probabilities);
      const avgUncertainty = uncertainty.reduce((sum, u) => sum + u, 0) / uncertainty.length;

      const volatility = this.calculateVolatility(data.slice(-20));
      const riskGate = confidence > 0.8 || volatility < 0.02;

      let action: 'LONG' | 'SHORT' | 'FLAT' = 'FLAT';

      if (Math.random() < this.explorationRate) {
        const actions: ('LONG' | 'SHORT' | 'FLAT')[] = ['LONG', 'SHORT', 'FLAT'];
        action = actions[Math.floor(Math.random() * actions.length)];
      } else {
        if (bullProb > this.config.thresholds.enterLong && bullProb > bearProb && riskGate) {
          action = 'LONG';
        } else if (bearProb > this.config.thresholds.enterShort && bearProb > bullProb && riskGate) {
          action = 'SHORT';
        }
      }

      return {
        action,
        bullProbability: bullProb,
        bearProbability: bearProb,
        neutralProbability: neutralProb,
        confidence,
        uncertainty: avgUncertainty,
        riskGate,
        reasoning: [
          `Exploration rate: ${this.explorationRate.toFixed(3)}`,
          `Volatility: ${volatility.toFixed(4)}`,
          `Uncertainty: ${avgUncertainty.toFixed(3)}`,
          `Risk gate: ${riskGate ? 'PASS' : 'BLOCK'}`
        ]
      };
    } catch (error: any) {
      this.logger.error('AI_PREDICTION_ERROR', { 
        error: error.message,
        dataLength: data.length 
      }, error);
      return this.getDefaultDecision('AI_PREDICTION_ERROR');
    }
  }

  async storeExperience(experience: Experience): Promise<void> {
    this.experienceReplay.store(experience);
  }

  async sampleBatch(batchSize: number): Promise<Experience[]> {
    return this.experienceReplay.sample(batchSize);
  }

  getTrainingMetrics(): TrainingMetrics[] {
    return [...this.trainingMetrics];
  }

  getLatestMetrics(): TrainingMetrics | null {
    return (this.trainingMetrics?.length || 0) > 0 ? this.trainingMetrics[this.trainingMetrics.length - 1] : null;
  }

  async getModelPerformance(): Promise<ModelPerformanceMetrics> {
    const latestMetrics = this.getLatestMetrics();
    return {
      accuracy: latestMetrics?.directionalAccuracy || 0,
      loss: latestMetrics?.mse || 0,
      explorationRate: this.explorationRate,
      experienceBufferSize: this.experienceReplay.size(),
      resetCount: latestMetrics?.resetEvents || 0,
      latency: Math.random() * 50 + 25, // Simulated latency
      memoryUsage: Math.random() * 500 + 1000 // Simulated memory usage
    };
  }

  async getTrainingStatus(): Promise<TrainingStatus> {
    return {
      isTraining: this.isTraining,
      currentEpoch: this.currentEpoch,
      totalEpochs: this.totalEpochs,
      currentLoss: this.currentLoss,
      learningRate: this.config.optimizer.lr,
      validationLoss: this.validationLoss,
      bestLoss: this.bestLoss
    };
  }

  private extractFeatures(data: MarketData[]): number[][] {
    return (data || []).map(candle => {
      const features = [
        candle.close,
        candle.high - candle.low,
        candle.close - candle.open,
        candle.volume,
        (candle.close - candle.open) / candle.open,
        ...new Array(15).fill(0)
      ];
      return features;
    });
  }

  private createTargets(data: MarketData[]): number[][] {
    const targets: number[][] = [];
    
    for (let i = 0; i < data.length - 1; i++) {
      const currentPrice = data[i].close;
      const futurePrice = data[i + 1].close;
      const priceChange = (futurePrice - currentPrice) / currentPrice;
      
      if (priceChange > 0.01) {
        targets.push([1, 0, 0]);
      } else if (priceChange < -0.01) {
        targets.push([0, 1, 0]);
      } else {
        targets.push([0, 0, 1]);
      }
    }
    
    targets.push([0, 0, 1]);
    return targets;
  }

  private normalizeTargets(targets: number[][]): number[][] {
    return targets;
  }

  private calculateVolatility(data: MarketData[]): number {
    if (data.length < 2) return 0;
    
    const returns = data.slice(1).map((d, i) => 
      Math.log(d.close / data[i].close)
    );
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private getDefaultDecision(reason: string): TradingDecision {
    this.logger.info('AI_PREDICTION_FALLBACK', { reason });
    return {
      action: 'FLAT',
      bullProbability: 0.33,
      bearProbability: 0.33,
      neutralProbability: 0.34,
      confidence: 0,
      uncertainty: 1,
      riskGate: false,
      reasoning: [reason, 'Using safe fallback prediction']
    };
  }

  /**
   * Get default training metrics when training fails
   */
  private getDefaultTrainingMetrics(reason: string): TrainingMetrics {
    this.logger.info('AI_TRAINING_FALLBACK', { reason });
    return {
      modelVersion: '1.0.0',
      epoch: 0,
      mse: 1.0,
      mae: 1.0,
      r2: 0,
      directionalAccuracy: 0,
      learningRate: this.config.optimizer.lr,
      resetEvents: 0,
      seed: 42,
      timestamp: Date.now()
    } as TrainingMetrics;
  }

  /**
   * Validate training metrics structure
   */
  private validateTrainingMetrics(metrics: any): boolean {
    if (!metrics || typeof metrics !== 'object') return false;
    return typeof metrics.mse === 'number' && 
           typeof metrics.mae === 'number' && 
           typeof metrics.r2 === 'number';
  }

  private detectInstability(metrics: TrainingMetrics): boolean {
    if (!isFinite(metrics.mse) || !isFinite(metrics.mae)) {
      return true;
    }
    
    if ((this.trainingMetrics?.length || 0) > 0) {
      const lastMetrics = this.trainingMetrics[this.trainingMetrics.length - 1];
      if (metrics.mse > lastMetrics.mse * this.config.stability.instability.spikeFactor) {
        return true;
      }
    }
    
    return false;
  }
}

export const aiService = new AIService();