/**
 * Minimal static server for production build.
 * - Redirects /admin and /admin/* to / so old links and cached /admin requests load the app at root.
 * - Serves dist/ at / with SPA fallback (unknown paths -> index.html).
 * - index.html sent with no-cache so updates are picked up.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DIST = path.join(__dirname, 'dist')
const PORT = 5174

const MIME = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

function sendFile(res, filePath, contentType) {
  const stream = fs.createReadStream(filePath)
  res.setHeader('Content-Type', contentType || MIME[path.extname(filePath)] || 'application/octet-stream')
  if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
  stream.pipe(res)
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname

  // Redirect old /admin paths to root so correct assets load
  if (pathname === '/admin' || pathname === '/admin/' || pathname.startsWith('/admin/')) {
    res.writeHead(302, { Location: '/' })
    res.end()
    return
  }

  const filePath = path.join(DIST, pathname === '/' ? 'index.html' : pathname)
  const resolved = path.resolve(filePath)
  const distResolved = path.resolve(DIST)
  if (!resolved.startsWith(distResolved)) {
    res.writeHead(403)
    res.end()
    return
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback
      const index = path.join(DIST, 'index.html')
      if (fs.existsSync(index)) {
        sendFile(res, index, 'text/html')
      } else {
        res.writeHead(404)
        res.end()
      }
      return
    }
    sendFile(res, filePath)
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serving at http://0.0.0.0:${PORT}`)
})
