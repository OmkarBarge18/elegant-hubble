import http.server
import socketserver
import json
import os
import urllib.parse
import time
import random
import re

PORT = 8000
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), 'public')

# In-memory storage for python runner
links_db = {
    'dev-launch': {
        'id': 'u_101',
        'slug': 'dev-launch',
        'originalUrl': 'https://github.com/expressjs/express',
        'title': 'Express Framework Core Repo',
        'isCustom': True,
        'createdAt': '2026-08-01',
        'clicks': 1420
    },
    'ai-research': {
        'id': 'u_102',
        'slug': 'ai-research',
        'originalUrl': 'https://arxiv.org/abs/2312.00000',
        'title': 'LLM Architecture & Scaling Paper',
        'isCustom': True,
        'createdAt': '2026-08-03',
        'clicks': 890
    },
    'redis-docs': {
        'id': 'u_103',
        'slug': 'redis-docs',
        'originalUrl': 'https://redis.io/docs/data-types/hashes/',
        'title': 'Redis Data Structures Documentation',
        'isCustom': True,
        'createdAt': '2026-08-05',
        'clicks': 540
    }
}

def get_lan_ip():
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Serve files from public folder
        parsed_path = urllib.parse.urlparse(path).path
        if parsed_path == '/':
            parsed_path = '/index.html'
        
        target_file = os.path.join(PUBLIC_DIR, parsed_path.lstrip('/'))
        if os.path.exists(target_file):
            return target_file
        return os.path.join(PUBLIC_DIR, 'index.html')

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Network Info for Multi-Device LAN Access
        if path == '/api/system/network-info':
            lan_ip = get_lan_ip()
            self.send_json_response(200, {
                'lanIp': lan_ip,
                'port': PORT,
                'networkUrl': f'http://{lan_ip}:{PORT}'
            })
            return

        # 1. System Health
        if path == '/api/system/health':
            self.send_json_response(200, {
                'status': 'HEALTHY',
                'uptimeSeconds': 3600,
                'lanIp': get_lan_ip(),
                'services': {
                    'server': {'status': 'ONLINE', 'port': PORT},
                    'redisCache': {'status': 'SIMULATED_REDIS_LRU', 'hitRatioPercent': 96.4},
                    'postgresDb': {'status': 'CONNECTED'}
                }
            })
            return

        # 2. Analytics Endpoint
        if path.startswith('/api/analytics/'):
            slug = path.replace('/api/analytics/', '')
            link = links_db.get(slug, {
                'slug': slug,
                'originalUrl': f'https://example.com/destinations/{slug}',
                'title': f'Campaign {slug}',
                'clicks': 350
            })
            self.send_json_response(200, {
                'success': True,
                'data': {
                    'summary': {
                        'slug': link['slug'],
                        'originalUrl': link['originalUrl'],
                        'title': link['title'],
                        'totalClicks': link['clicks'],
                        'uniqueVisitors': int(link['clicks'] * 0.78)
                    },
                    'cache': {'status': 'REDIS_CACHE_HIT', 'latencyMs': 1.15}
                }
            })
            return

        # 3. Short URL Redirection: /:slug
        slug = path.lstrip('/')
        if slug and not slug.startswith('api') and '.' not in slug and not slug.endswith('.html') and not slug.endswith('.js') and not slug.endswith('.css'):
            link_record = links_db.get(slug)
            target_url = link_record['originalUrl'] if link_record else None
            
            if not target_url and (slug.startswith('http://') or slug.startswith('https://')):
                target_url = slug
            
            if target_url:
                if not target_url.startswith('http://') and not target_url.startswith('https://'):
                    target_url = 'https://' + target_url

                if link_record:
                    link_record['clicks'] = link_record.get('clicks', 0) + 1
                    
                self.send_response(302)
                self.send_header('Location', target_url)
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.send_header('X-Redirected-By', 'PulseLink-Engine')
                self.end_headers()
                return

        # Default static file serving
        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/shorten':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                body = json.loads(post_data)
                original_url = body.get('originalUrl')
                custom_slug = body.get('customSlug')
                title = body.get('title')

                if not original_url:
                    self.send_json_response(400, {'error': 'Invalid URL'})
                    return

                slug = custom_slug.strip() if custom_slug else f"sl_{random.randint(1000, 9999)}"
                link_entry = {
                    'id': f'u_{random.randint(100, 999)}',
                    'slug': slug,
                    'originalUrl': original_url,
                    'title': title or urllib.parse.urlparse(original_url).netloc,
                    'isCustom': bool(custom_slug),
                    'createdAt': time.strftime('%Y-%m-%d'),
                    'clicks': 0
                }
                links_db[slug] = link_entry

                lan_ip = get_lan_ip()
                short_url = f"http://{lan_ip}:{PORT}/{slug}"

                self.send_json_response(201, {
                    'success': True,
                    'data': {
                        'id': link_entry['id'],
                        'slug': slug,
                        'shortUrl': short_url,
                        'originalUrl': original_url,
                        'title': link_entry['title'],
                        'isCustom': link_entry['isCustom'],
                        'createdAt': link_entry['createdAt']
                    }
                })
            except Exception as e:
                self.send_json_response(500, {'error': str(e)})
            return

    def send_json_response(self, code, data):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

if __name__ == '__main__':
    print("=======================================================")
    print(f"PulseLink Local Server listening at http://localhost:{PORT}")
    print("=======================================================")
    with socketserver.TCPServer(("", PORT), RequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
