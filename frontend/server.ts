import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route: AI Inference Simulation
  app.post('/v1/predict', (req, res) => {
    const start = Date.now();
    
    // Simulate complex density grid (8x8)
    const gridSize = 8;
    const densityGrid = [];
    let totalCount = 0;
    let maxDensity = 0;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        // Higher density in the center to simulate focus
        const distFromCenter = Math.sqrt(Math.pow(r - 3.5, 2) + Math.pow(c - 3.5, 2));
        const bias = Math.max(0, 5 - distFromCenter);
        const cellCount = Math.floor(Math.random() * 8 + bias * 3);
        const density = cellCount / 20; // Simulated normalized density
        
        totalCount += cellCount;
        maxDensity = Math.max(maxDensity, density);
        
        densityGrid.push({
          row: r,
          col: c,
          density,
          count: cellCount
        });
      }
    }

    const averageDensity = totalCount / (gridSize * gridSize * 15); // Simulated average
    
    let level = 'Low';
    if (totalCount > 300 || maxDensity > 0.8) level = 'Overcrowded';
    else if (totalCount > 150 || maxDensity > 0.6) level = 'High';
    else if (totalCount > 80 || maxDensity > 0.4) level = 'Moderate';
    else level = 'Low';

    const latency = `${Date.now() - start + 85}ms`;

    res.json({
      totalCount,
      averageDensity: parseFloat(averageDensity.toFixed(2)),
      peakDensity: parseFloat(maxDensity.toFixed(2)),
      densityGrid,
      level,
      latency
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
