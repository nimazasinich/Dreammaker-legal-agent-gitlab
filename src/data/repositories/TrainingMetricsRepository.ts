import { Database } from 'better-sqlite3';
import { BaseRepository } from './BaseRepository.js';
import { TrainingMetrics } from '../../types/index.js';

interface TrainingMetricsRow {
  id: number;
  epoch: number;
  timestamp: number;
  model_version: string;
  mse: number;
  mae: number;
  r_squared: number;
  directional_accuracy: number;
  classification_accuracy: number;
  gradient_norm: number;
  learning_rate: number;
  nan_count: number;
  inf_count: number;
  reset_count: number;
  epsilon: number;
  exploration_ratio: number;
  exploitation_ratio: number;
  created_at: number;
}

export class TrainingMetricsRepository extends BaseRepository<TrainingMetrics> {
  constructor(database: Database) {
    super(database, 'training_metrics');
  }

  protected mapRowToEntity(row: TrainingMetricsRow): TrainingMetrics {
    return {
      epoch: row.epoch,
      timestamp: row.timestamp,
      loss: {
        mse: row.mse,
        mae: row.mae,
        rSquared: row.r_squared
      },
      accuracy: {
        directional: row.directional_accuracy,
        classification: row.classification_accuracy
      },
      gradientNorm: row.gradient_norm,
      learningRate: row.learning_rate,
      stabilityMetrics: {
        nanCount: row.nan_count,
        infCount: row.inf_count,
        resetCount: row.reset_count
      },
      explorationStats: {
        epsilon: row.epsilon,
        explorationRatio: row.exploration_ratio,
        exploitationRatio: row.exploitation_ratio
      }
    };
  }

  protected mapEntityToRow(entity: TrainingMetrics): any {
    return {
      epoch: entity.epoch,
      timestamp: entity.timestamp,
      model_version: 'v1.0', // Default version
      mse: entity.loss.mse,
      mae: entity.loss.mae,
      r_squared: entity.loss.rSquared,
      directional_accuracy: entity.accuracy.directional,
      classification_accuracy: entity.accuracy.classification,
      gradient_norm: entity.gradientNorm,
      learning_rate: entity.learningRate,
      nan_count: entity.stabilityMetrics.nanCount,
      inf_count: entity.stabilityMetrics.infCount,
      reset_count: entity.stabilityMetrics.resetCount,
      epsilon: entity.explorationStats.epsilon,
      exploration_ratio: entity.explorationStats.explorationRatio,
      exploitation_ratio: entity.explorationStats.exploitationRatio
    };
  }

  async insertMetrics(metrics: TrainingMetrics, modelVersion: string = 'v1.0'): Promise<TrainingMetrics> {
    try {
      const query = `
        INSERT INTO ${this.tableName} 
        (epoch, timestamp, model_version, mse, mae, r_squared, directional_accuracy, 
         classification_accuracy, gradient_norm, learning_rate, nan_count, inf_count, 
         reset_count, epsilon, exploration_ratio, exploitation_ratio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        metrics.epoch,
        metrics.timestamp,
        modelVersion,
        metrics.loss.mse,
        metrics.loss.mae,
        metrics.loss.rSquared,
        metrics.accuracy.directional,
        metrics.accuracy.classification,
        metrics.gradientNorm,
        metrics.learningRate,
        metrics.stabilityMetrics.nanCount,
        metrics.stabilityMetrics.infCount,
        metrics.stabilityMetrics.resetCount,
        metrics.explorationStats.epsilon,
        metrics.explorationStats.explorationRatio,
        metrics.explorationStats.exploitationRatio
      ];

      this.executeStatement(query, params);
      
      this.logger.info('Training metrics inserted', {
        epoch: metrics.epoch,
        modelVersion,
        mse: metrics.loss.mse,
        directionalAccuracy: metrics.accuracy.directional
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to insert training metrics', {
        epoch: metrics.epoch,
        modelVersion
      }, error as Error);
      throw error;
    }
  }

  async getLatestMetrics(modelVersion?: string, limit: number = 100): Promise<TrainingMetrics[]> {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];

      if (modelVersion) {
        query += ` WHERE model_version = ?`;
        params.push(modelVersion);
      }

      query += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      const rows = this.executeQuery<TrainingMetricsRow>(query, params);
      return (rows || []).map(row => this.mapRowToEntity(row));
    } catch (error) {
      this.logger.error('Failed to get latest training metrics', {
        modelVersion,
        limit
      }, error as Error);
      throw error;
    }
  }

  async getMetricsByEpochRange(
    startEpoch: number, 
    endEpoch: number, 
    modelVersion?: string
  ): Promise<TrainingMetrics[]> {
    try {
      let query = `
        SELECT * FROM ${this.tableName} 
        WHERE epoch >= ? AND epoch <= ?
      `;
      const params: any[] = [startEpoch, endEpoch];

      if (modelVersion) {
        query += ` AND model_version = ?`;
        params.push(modelVersion);
      }

      query += ` ORDER BY epoch ASC`;

      const rows = this.executeQuery<TrainingMetricsRow>(query, params);
      return (rows || []).map(row => this.mapRowToEntity(row));
    } catch (error) {
      this.logger.error('Failed to get metrics by epoch range', {
        startEpoch,
        endEpoch,
        modelVersion
      }, error as Error);
      throw error;
    }
  }

  async getBestMetrics(modelVersion?: string): Promise<TrainingMetrics | null> {
    try {
      let query = `
        SELECT * FROM ${this.tableName}
      `;
      const params: any[] = [];

      if (modelVersion) {
        query += ` WHERE model_version = ?`;
        params.push(modelVersion);
      }

      query += ` ORDER BY directional_accuracy DESC, mse ASC LIMIT 1`;

      const row = this.executeQuerySingle<TrainingMetricsRow>(query, params);
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      this.logger.error('Failed to get best metrics', { modelVersion }, error as Error);
      throw error;
    }
  }

  async getModelVersions(): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT model_version 
        FROM ${this.tableName} 
        ORDER BY model_version DESC
      `;
      const rows = this.executeQuery<{ model_version: string }>(query);
      return (rows || []).map(row => row.model_version);
    } catch (error) {
      this.logger.error('Failed to get model versions', {}, error as Error);
      throw error;
    }
  }

  async getTrainingProgress(modelVersion?: string): Promise<{
    totalEpochs: number;
    bestAccuracy: number;
    currentLearningRate: number;
    totalResets: number;
  }> {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_epochs,
          MAX(directional_accuracy) as best_accuracy,
          MAX(learning_rate) as current_learning_rate,
          MAX(reset_count) as total_resets
        FROM ${this.tableName}
      `;
      const params: any[] = [];

      if (modelVersion) {
        query += ` WHERE model_version = ?`;
        params.push(modelVersion);
      }

      const result = this.executeQuerySingle<{
        total_epochs: number;
        best_accuracy: number;
        current_learning_rate: number;
        total_resets: number;
      }>(query, params);

      return {
        totalEpochs: result?.total_epochs || 0,
        bestAccuracy: result?.best_accuracy || 0,
        currentLearningRate: result?.current_learning_rate || 0,
        totalResets: result?.total_resets || 0
      };
    } catch (error) {
      this.logger.error('Failed to get training progress', { modelVersion }, error as Error);
      throw error;
    }
  }
}