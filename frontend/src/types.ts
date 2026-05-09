export type DensityLevel = 'Low' | 'Moderate' | 'High' | 'Overcrowded';

export interface DensityRegion {
  row: number;
  col: number;
  density: number; // 0.0 to 1.0
  count: number;
}

export interface InferenceResult {
  totalCount: number;
  averageDensity: number;
  peakDensity: number;
  densityGrid: DensityRegion[];
  level: DensityLevel;
  latency: string;
  timestamp: string;
  fps?: number;
}

export type AnalysisMode = 'image' | 'stream';
