# ML Training & Backtesting Setup

**Real AI Training Pipeline with Hugging Face Datasets & Walk-Forward Optimization**

This implementation adds a production-ready ML training pipeline that:
- ✅ Uses **real** Hugging Face model-ready historical datasets (no mocks/placeholders)
- ✅ Implements **walk-forward optimization** for realistic backtesting
- ✅ Supports **online learning** during backtesting to reduce strategy weaknesses
- ✅ Persists trained models and backtest artifacts
- ✅ Enforces **real data only** policy in online mode

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/TypeScript)               │
│  - MLTrainingPanel component in TrainingView                │
│  - Controls for training, backtesting, model management     │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/JSON
┌─────────────────▼───────────────────────────────────────────┐
│                  Express Backend (Node.js)                  │
│  - Proxy routes: /api/ml/*                                  │
│  - Routes to Python ML microservice                         │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP Proxy
┌─────────────────▼───────────────────────────────────────────┐
│              Python ML Microservice (FastAPI)               │
│  - Training engine (sklearn models)                         │
│  - Walk-forward backtest with online learning               │
│  - HF dataset loader & feature engineering                  │
│  - Model persistence & artifact management                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd ml
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# ML microservice host
ML_HOST=http://localhost:8765

# Hugging Face dataset (optional - override in UI)
HF_DATASET_ID=your-org/crypto-ohlcv-dataset

# HF token for private datasets (optional)
HF_TOKEN=hf_your_token_here
```

### 3. Start the ML Microservice

**Terminal 1 - ML Service:**
```bash
cd ml
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8765
```

**Terminal 2 - Express Backend:**
```bash
pnpm build
node dist/server.js
```

The ML service will be available at `http://localhost:8765`

---

## Features

### 1. Training Pipeline

**Train models on real HF datasets with configurable parameters:**

- **Dataset**: Hugging Face dataset ID (e.g., `crypto/btc-usdt-1h`)
- **Symbols**: Target trading pairs (e.g., `BTC/USDT`, `ETH/USDT`)
- **Task**: Classification (BUY/SELL/HOLD) or Regression (future returns)
- **Model Types**:
  - `gbc` - Gradient Boosting Classifier
  - `rfc` - Random Forest Classifier
  - `sgdc` - SGD Classifier (supports online learning)
  - `gbr` - Gradient Boosting Regressor
  - `sgdr` - SGD Regressor (supports online learning)
- **Target Horizon**: Number of periods ahead to predict
- **Windows**: Train/validation time windows

**Feature Engineering:**
- EMA indicators (12, 26, 50, 200 periods)
- RSI, MACD, Bollinger Bands, ATR
- Volume analysis & price momentum
- Return features (1h, 3h, 6h, 12h, 24h)

**Artifacts Saved:**
- `/models/<model_id>/model.joblib` - Trained model
- `/models/<model_id>/metrics.json` - Training metrics & metadata

### 2. Walk-Forward Backtesting

**Realistic backtesting with walk-forward optimization:**

- Split data into overlapping train/test windows
- Train on historical window → Test on future window
- **Online Learning** (optional):
  - Update model weights during backtest using revealed data
  - Simulates continuous learning in production
  - Only available for SGD models (`sgdc`, `sgdr`)
- **Transaction Costs**:
  - Trading fees (default: 5 bps)
  - Slippage (default: 5 bps)

**Metrics Calculated:**
- Total Return & Return %
- Sharpe Ratio
- Win Rate & Total Trades
- Maximum Drawdown
- Per-fold performance

**Artifacts Saved:**
- `/artifacts/<run_id>/report.json` - Full backtest report
- `/artifacts/<run_id>/equity_curve.csv` - Equity over time
- `/artifacts/<run_id>/trades.csv` - Trade log
- `/artifacts/<run_id>/feature_importance.json` - Feature rankings

### 3. Genetic Algorithm Weight Optimizer (Optional)

**Optimize signal weights using GA:**

```python
from ml.core.ga_weights import optimize_strategy_weights

optimized_weights = optimize_strategy_weights(
    signal_names=['rsi', 'macd', 'ema_cross', 'volume'],
    backtest_function=lambda weights: run_backtest_with_weights(weights),
    objective='sharpe',
    constraints={'max_drawdown': -0.2, 'min_win_rate': 0.5}
)
```

---

## API Endpoints

### Training

**POST** `/api/ml/train/start`
```json
{
  "dataset": "crypto/btc-usdt-1h",
  "symbols": ["BTC/USDT"],
  "timeframe": "1h",
  "task": "classification",
  "target_horizon": 12,
  "model": "gbc",
  "train_window": "365d",
  "valid_window": "60d"
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "running",
  "model_id": "gbc_classification_20250108_123456"
}
```

**GET** `/api/ml/train/status?job_id=<uuid>`

Returns training progress and metrics.

### Backtesting

**POST** `/api/ml/backtest/run`
```json
{
  "model_id": "latest",
  "symbols": ["BTC/USDT", "ETH/USDT"],
  "timeframe": "1h",
  "train_window": "365d",
  "test_window": "30d",
  "fees_bps": 5,
  "slippage_bps": 5,
  "online": true,
  "save_updates": true,
  "buy_threshold": 0.6,
  "sell_threshold": 0.4
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "run_id": "backtest_20250108_123456",
  "results": {
    "total_return_pct": 12.5,
    "sharpe_ratio": 1.8,
    "win_rate": 0.62,
    "max_drawdown_pct": -8.3,
    "total_trades": 45
  }
}
```

### Model Management

**GET** `/api/ml/models`

List all trained models.

**GET** `/api/ml/models/<model_id>/metrics`

Get detailed model metadata and training metrics.

**GET** `/api/ml/artifacts`

List all backtest run artifacts.

---

## Usage Example

### 1. Train a Model

Navigate to **Training** page in the UI, switch to the **ML Training & Backtesting** section:

1. Select **Train** tab
2. Configure:
   - Dataset: `crypto/btc-usdt-1h`
   - Symbols: `BTC/USDT`
   - Task: `Classification`
   - Model: `Gradient Boosting Classifier`
   - Target Horizon: `12` (predict 12 periods ahead)
3. Click **Start Training**
4. Monitor progress (20% → 40% → 60% → 80% → 100%)
5. Model saved to `/models/<model_id>/`

### 2. Run Walk-Forward Backtest

1. Select **Backtest** tab
2. Configure:
   - Model: Select trained model or `latest`
   - Symbols: `BTC/USDT,ETH/USDT`
   - Train Window: `365d`
   - Test Window: `30d`
   - ✅ Enable Online Learning
   - ✅ Save Updated Model
3. Click **Run Walk-Forward Backtest**
4. View results:
   - Total Return: +12.5%
   - Sharpe: 1.8
   - Win Rate: 62%
   - Max Drawdown: -8.3%

### 3. Review Artifacts

```bash
# View equity curve
cat artifacts/<run_id>/equity_curve.csv

# View full report
cat artifacts/<run_id>/report.json

# View feature importance
cat artifacts/<run_id>/feature_importance.json
```

---

## Dataset Requirements

Hugging Face datasets must have these columns:

- `timestamp` (datetime)
- `open` (float)
- `high` (float)
- `low` (float)
- `close` (float)
- `volume` (float)

Optional columns:
- `symbol` (string) - for multi-symbol datasets

**Example HF datasets:**
- Public: `cryptocompare/ohlcv-1h`
- Custom: Upload your own OHLCV CSV to HF Datasets

---

## Online Learning

When **online learning** is enabled during backtesting:

1. **Walk-forward splits**: Data divided into overlapping train/test windows
2. **For each fold**:
   - Train model on historical window
   - Test on future window
   - **Reveal labels** as backtest progresses
   - **Incrementally update model** with new data (if SGD model)
3. **Save updated model** (optional) to `/models/<model_id>_updated_<timestamp>/`

This simulates continuous learning in production and helps identify if your strategy can adapt to market regime changes.

---

## Data Policy Enforcement

- **Online mode**: Only real HF datasets allowed; no mocks/synthetic data
- **Demo mode**: ML training disabled (real data requirement)
- **Test mode**: Can use synthetic data if `ALLOW_FAKE_DATA=true`

The ML pipeline respects the existing data policy (`assertEnv()` checks).

---

## Production Deployment

### Docker (Future)

```dockerfile
# ml/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8765"]
```

### Railway/Render

1. Add Python buildpack
2. Set build command: `pip install -r ml/requirements.txt`
3. Set start command: `uvicorn ml.server:app --host 0.0.0.0 --port $PORT`
4. Set env vars: `HF_DATASET_ID`, `HF_TOKEN` (if needed)

---

## Troubleshooting

### ML service not starting

```bash
# Check Python version
python --version  # Should be 3.10+

# Reinstall dependencies
cd ml
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### HF dataset not loading

```bash
# Test dataset access
python -c "from datasets import load_dataset; print(load_dataset('crypto/btc-usdt-1h', split='train'))"

# Set HF token if dataset is private
export HF_TOKEN=hf_your_token_here
```

### Port conflicts

Change ML port in `.env`:
```bash
ML_HOST=http://localhost:8766
```

And start service with:
```bash
uvicorn server:app --port 8766
```

---

## Technical Details

### Model Types

| Model | Type | Online Learning | Speed | Accuracy |
|-------|------|----------------|-------|----------|
| GBC | Classifier | ❌ | Medium | High |
| RFC | Classifier | ❌ | Fast | Medium-High |
| SGD-C | Classifier | ✅ | Very Fast | Medium |
| GBR | Regressor | ❌ | Medium | High |
| SGD-R | Regressor | ✅ | Very Fast | Medium |

**Online learning** requires SGD models (supports `partial_fit()`).

### Feature Scaling

All models use `StandardScaler` for feature normalization:
- Mean = 0, Std = 1
- Scaler fitted on training data, applied to validation/test

### Walk-Forward Window Calculation

```python
train_window = 365 days
test_window = 30 days

Fold 1: train[0:365], test[365:395]
Fold 2: train[30:395], test[395:425]
Fold 3: train[60:425], test[425:455]
...
```

Overlapping windows ensure all data used and robust validation.

---

## Next Steps

1. **Hyperparameter Tuning**: Use grid search or Bayesian optimization
2. **Ensemble Models**: Combine multiple models for better predictions
3. **Deep Learning**: Add LSTM/Transformer models for sequence learning
4. **Real-time Inference**: Connect backtest winners to live trading
5. **A/B Testing**: Compare strategy performance with/without ML signals

---

## Support

For issues or questions:
- Check logs: `tail -f ml/logs/server.log`
- Review training metrics: `cat models/<model_id>/metrics.json`
- Inspect backtest artifacts: `ls -la artifacts/<run_id>/`

**Important**: This is a real ML training pipeline. Always backtest thoroughly before using models in production trading.
