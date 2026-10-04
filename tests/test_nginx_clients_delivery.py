"""Keep the protected Clients API route in every normal UI image."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ClientsProxyDelivery(unittest.TestCase):
    def test_runtime_image_includes_proxy_configuration(self):
        runtime = (ROOT / 'Dockerfile').read_text().split('AS runtime', 1)[1]
        self.assertIn('COPY nginx.clients.conf /etc/nginx/conf.d/default.conf', runtime)

    def test_proxy_preserves_backend_authorization_and_request_path(self):
        conf = (ROOT / 'nginx.clients.conf').read_text()
        self.assertIn('location /clients-api/', conf)
        self.assertIn('proxy_pass http://owclients:8080;', conf)
        self.assertIn('proxy_set_header Authorization $http_authorization;', conf)
        self.assertIn('access_log off;', conf)


if __name__ == '__main__':
    unittest.main()
