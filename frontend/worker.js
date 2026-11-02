export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Nếu là preflight OPTIONS request cho API
    if (request.method === 'OPTIONS' && (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io'))) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': url.origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        },
      })
    }

    // Chuyển tiếp các request API, Socket.io, Uploads tới AWS Application Load Balancer
    if (
      url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/socket.io') ||
      url.pathname.startsWith('/uploads') ||
      url.pathname === '/health'
    ) {
      const albUrl = `http://alb-cloudchat-1765117084.us-east-1.elb.amazonaws.com${url.pathname}${url.search}`

      const newHeaders = new Headers(request.headers)
      newHeaders.set('Host', 'alb-cloudchat-1765117084.us-east-1.elb.amazonaws.com')
      newHeaders.set('X-Forwarded-Proto', 'https')

      // Nếu là kết nối WebSocket (Socket.io), chuyển tiếp trực tiếp để Cloudflare Worker không làm hỏng kết nối
      if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
        return fetch(albUrl, {
          method: request.method,
          headers: newHeaders,
        })
      }

      const isReadMethod = ['GET', 'HEAD'].includes(request.method)
      let requestBody = null
      if (!isReadMethod) {
        try {
          requestBody = await request.arrayBuffer()
        } catch {
          requestBody = null
        }
      }

      try {
        let response = await fetch(albUrl, {
          method: request.method,
          headers: newHeaders,
          body: isReadMethod ? null : requestBody,
          redirect: 'follow',
        })

        // Tự động thử lại 1 lần nếu gặp lỗi 404 "Cannot POST/GET" (do 1 trong các backend chưa pull code mới) hoặc lỗi 502/503 từ ALB
        if (
          (response.status === 404 && url.pathname.startsWith('/api/')) ||
          response.status === 502 ||
          response.status === 503
        ) {
          const bodyClone = response.clone()
          const text = await bodyClone.text().catch(() => '')
          if (text.includes('Cannot POST') || text.includes('Cannot GET') || response.status >= 500) {
            const retryResponse = await fetch(albUrl, {
              method: request.method,
              headers: newHeaders,
              body: isReadMethod ? null : requestBody,
              redirect: 'follow',
            }).catch(() => null)
            if (retryResponse && retryResponse.status !== 404) {
              response = retryResponse
            }
          }
        }

        const responseHeaders = new Headers(response.headers)
        responseHeaders.set('Access-Control-Allow-Origin', url.origin)
        responseHeaders.set('Access-Control-Allow-Credentials', 'true')
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        responseHeaders.set('Access-Control-Expose-Headers', 'X-Backend-Host')

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        })
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Lỗi kết nối tới AWS Backend: ' + err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Mặc định: Phục vụ Static Assets (React frontend trong dist)
    return env.ASSETS.fetch(request)
  },
}
