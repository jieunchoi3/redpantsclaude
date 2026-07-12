import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import type { IncomingMessage } from 'node:http'
import {
  generateWithGemini,
  type GeminiImageInput,
} from './api/geminiShared.js'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** 로컬 개발용 /api/gemini 프록시 — 키는 .env의 GEMINI_API_KEY만 사용 */
function geminiDevApiPlugin(apiKey: string | undefined): Plugin {
  return {
    name: 'gemini-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/gemini', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }
        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }))
          return
        }

        try {
          const raw = await readBody(req)
          const body = JSON.parse(raw || '{}') as {
            prompt?: string
            image?: GeminiImageInput & { mimeType?: string }
          }
          const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
          if (!prompt) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'prompt is required' }))
            return
          }

          let image: GeminiImageInput | undefined
          if (body.image && typeof body.image.data === 'string') {
            const mime =
              body.image.mime_type ??
              (typeof body.image.mimeType === 'string'
                ? body.image.mimeType
                : '')
            if (mime) {
              image = { mime_type: mime, data: body.image.data }
            }
          }

          const result = await generateWithGemini(apiKey, { prompt, image })
          if (!result.ok) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: 'All Gemini model attempts failed',
                attempts: result.attempts,
              }),
            )
            return
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              text: result.text,
              model: result.model,
              failed_attempts: result.failed_attempts,
            }),
          )
        } catch (err) {
          console.error('[gemini-dev]', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'Gemini proxy error',
              detail: err instanceof Error ? err.message : String(err),
            }),
          )
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      tailwindcss(),
      geminiDevApiPlugin(env.GEMINI_API_KEY),
    ],
  }
})
