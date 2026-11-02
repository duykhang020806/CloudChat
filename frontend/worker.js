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

      try {
        const response = await fetch(albUrl, {
          method: request.method,
          headers: newHeaders,
          body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
          redirect: 'follow',
        })

        const responseHeaders = new Headers(response.headers)
        responseHeaders.set('Access-Control-Allow-Origin', url.origin)
        responseHeaders.set('Access-Control-Allow-Credentials', 'true')
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

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
