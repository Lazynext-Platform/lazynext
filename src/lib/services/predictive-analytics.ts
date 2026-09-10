// ── Predictive Analytics ──
// Lightweight, dependency-free statistical helpers used by the analytics
// service for forecasting, anomaly detection, and trend analysis.

export interface Point {
  x: number;
  y: number;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

export interface ForecastResult {
  forecast: number[];
  confidence: {
    lower: number[];
    upper: number[];
  };
}

export type TrendDirection = 'up' | 'down' | 'flat';

// ── PredictiveAnalytics ──

export const PredictiveAnalytics = {
  /**
   * Simple linear regression (ordinary least squares).
   * Returns slope, intercept, and coefficient of determination (r²).
   */
  linearRegression(points: Point[]): RegressionResult {
    if (points.length < 2) {
      return { slope: 0, intercept: points[0]?.y ?? 0, rSquared: 0 };
    }

    const n = points.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
      sumYY += p.y * p.y;
    }

    const meanX = sumX / n;
    const meanY = sumY / n;

    const denom = n * sumXX - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const intercept = meanY - slope * meanX;

    // r² = (nΣxy - ΣxΣy)² / [(nΣx² - (Σx)²)(nΣy² - (Σy)²)]
    const numR = (n * sumXY - sumX * sumY) ** 2;
    const denR = (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY);
    const rSquared = denR === 0 ? 0 : numR / denR;

    return { slope, intercept, rSquared };
  },

  /**
   * Forecast future values using linear regression on historical data.
   * Returns forecasted values plus a confidence band (±1.96 × std error
   * approximated by residual standard deviation for a ~95% interval).
   */
  forecast(historical: number[], periods: number): ForecastResult {
    if (periods <= 0) {
      return { forecast: [], confidence: { lower: [], upper: [] } };
    }

    const points: Point[] = historical.map((y, x) => ({ x, y }));
    const { slope, intercept } = this.linearRegression(points);

    // Residual standard deviation for confidence band
    let residualSumSquares = 0;
    for (const p of points) {
      const predicted = slope * p.x + intercept;
      residualSumSquares += (p.y - predicted) ** 2;
    }
    const residualStd = points.length > 2
      ? Math.sqrt(residualSumSquares / (points.length - 2))
      : 0;
    const margin = 1.96 * residualStd;

    const forecast: number[] = [];
    const lower: number[] = [];
    const upper: number[] = [];
    const startX = historical.length;

    for (let i = 0; i < periods; i++) {
      const x = startX + i;
      const value = slope * x + intercept;
      forecast.push(Math.round(value * 100) / 100);
      lower.push(Math.round((value - margin) * 100) / 100);
      upper.push(Math.round((value + margin) * 100) / 100);
    }

    return { forecast, confidence: { lower, upper } };
  },

  /**
   * Calculate a simple moving average over a window of `window` points.
   */
  movingAverage(data: number[], window: number): number[] {
    if (window <= 0 || data.length === 0) return [];
    if (window > data.length) {
      // Return a single average if window exceeds data length
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      return [Math.round(avg * 100) / 100];
    }

    const result: number[] = [];
    for (let i = 0; i <= data.length - window; i++) {
      let sum = 0;
      for (let j = 0; j < window; j++) {
        sum += data[i + j];
      }
      result.push(Math.round((sum / window) * 100) / 100);
    }
    return result;
  },

  /**
   * Exponential smoothing (single / simple exponential smoothing).
   * `alpha` is the smoothing factor (0 < alpha ≤ 1).
   */
  exponentialSmoothing(data: number[], alpha: number): number[] {
    if (data.length === 0) return [];
    const a = Math.max(0, Math.min(1, alpha));

    const result: number[] = [data[0]];
    for (let i = 1; i < data.length; i++) {
      const smoothed = a * data[i] + (1 - a) * result[i - 1];
      result.push(Math.round(smoothed * 100) / 100);
    }
    return result;
  },

  /**
   * Detect anomalies using z-score. Returns indices of data points whose
   * absolute z-score exceeds the threshold (default 2.0).
   */
  detectAnomalies(data: number[], threshold: number = 2.0): number[] {
    if (data.length < 2) return [];

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / data.length;
    const std = Math.sqrt(variance);

    if (std === 0) return [];

    const anomalies: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const z = (data[i] - mean) / std;
      if (Math.abs(z) > threshold) {
        anomalies.push(i);
      }
    }
    return anomalies;
  },

  /**
   * Basic seasonal decomposition using a simple averaging method.
   * Returns the trend, seasonal, and residual components.
   */
  seasonalDecomposition(data: number[], period: number): {
    trend: number[];
    seasonal: number[];
    residual: number[];
  } {
    if (data.length === 0 || period <= 0) {
      return { trend: [], seasonal: [], residual: [] };
    }

    // Trend: centered moving average over one period
    const trend: number[] = [];
    const half = Math.floor(period / 2);
    for (let i = 0; i < data.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - half; j <= i + half; j++) {
        if (j >= 0 && j < data.length) {
          sum += data[j];
          count++;
        }
      }
      trend.push(count > 0 ? Math.round((sum / count) * 100) / 100 : data[i]);
    }

    // Seasonal: average of (data - trend) per seasonal index
    const seasonalIdx: number[][] = Array.from({ length: period }, () => []);
    for (let i = 0; i < data.length; i++) {
      const detrended = data[i] - trend[i];
      seasonalIdx[i % period].push(detrended);
    }
    const seasonalMeans = seasonalIdx.map((arr) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
    );

    const seasonal: number[] = [];
    const residual: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const s = Math.round(seasonalMeans[i % period] * 100) / 100;
      seasonal.push(s);
      residual.push(Math.round((data[i] - trend[i] - s) * 100) / 100);
    }

    return { trend, seasonal, residual };
  },

  /**
   * Pearson correlation coefficient between two arrays.
   */
  correlation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let denX = 0;
    let denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : Math.round((num / den) * 10000) / 10000;
  },

  /**
   * Determine if a time series is trending up, down, or flat.
   * Uses the sign of the linear regression slope, with a small
   * relative threshold to avoid classifying noise as a trend.
   */
  trendDirection(data: number[]): TrendDirection {
    if (data.length < 2) return 'flat';

    const points: Point[] = data.map((y, x) => ({ x, y }));
    const { slope } = this.linearRegression(points);

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    if (mean === 0) return 'flat';

    const relativeSlope = slope / Math.abs(mean);
    const threshold = 0.02; // 2% relative change per step

    if (relativeSlope > threshold) return 'up';
    if (relativeSlope < -threshold) return 'down';
    return 'flat';
  },
};
