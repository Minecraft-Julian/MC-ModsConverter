/**
 * API: /api/health
 * GET: Check if Ollama is reachable and which models are available.
 */
import { healthCheck } from '../lib/ollama-client.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const health = await healthCheck();

    return res.status(health.ok ? 200 : 503).json({
        status: health.ok ? 'online' : 'offline',
        ollamaUrl: health.url,
        models: health.models || [],
        error: health.error || null,
        timestamp: new Date().toISOString()
    });
}
