# Reverse Proxy And TLS Handoff

The current production Compose package exposes backend and frontend ports on the host. External routing and TLS termination are intentionally host/platform owned.

This handoff defines the routing contract that a reverse proxy, load balancer or ingress must satisfy before staging is accepted.

## Scope

The proxy/TLS layer must route:

- frontend public URL to the frontend container port from `FRONTEND_PORT`;
- API public URL to the backend container port from `BACKEND_PORT`;
- HTTPS traffic from users/operators to the public frontend and API URLs.

The repository does not prescribe nginx, Caddy, Traefik, HAProxy, cloud load balancers or Kubernetes ingress.

## Required Env Alignment

The rendered staging/production env file must align with the external routes:

```text
APP_ALLOWED_ORIGIN=https://crm-staging.example.com
VITE_API_BASE_URL=https://api.crm-staging.example.com
```

Rules:

- `APP_ALLOWED_ORIGIN` is the browser-facing frontend origin.
- `VITE_API_BASE_URL` is the browser-facing API base URL.
- Remote environments must use HTTPS.
- Local drills may use localhost HTTP only with explicit override flags.
- Do not expose PostgreSQL publicly.

## Required Proxy Behavior

The proxy/TLS layer must provide:

- HTTP to HTTPS redirect, or HTTPS-only external access;
- valid certificate chain for frontend and API hostnames;
- forwarding to the configured backend/frontend host ports;
- preservation of normal HTTP methods, headers and request bodies;
- no caching of API mutation responses;
- request size limits large enough for import preview/upload flows;
- access logs or platform logs available to the operator.

## Validation

Run after DNS/TLS/proxy setup and after the Compose stack is up:

```bash
scripts/reverse-proxy-tls-check.sh .env.staging
scripts/deployment-smoke.sh health
```

For a local drill against the dev runtime:

```bash
REVERSE_PROXY_TLS_ALLOW_INSECURE=1 scripts/reverse-proxy-tls-check.sh /tmp/salesops-local-route.env
```

The route check verifies:

- frontend/API URLs are present in the env file;
- remote URLs use HTTPS unless explicitly overridden;
- frontend route returns a successful response;
- API `/readyz` returns a successful response;
- API readiness is checked with the configured frontend origin header.

## Acceptance Gate

Do not accept reverse proxy/TLS handoff until:

- `scripts/reverse-proxy-tls-check.sh` passes against the external URLs;
- `scripts/deployment-smoke.sh health` passes against the same external URLs;
- backend `/readyz` is not exposed through an unrelated public hostname;
- PostgreSQL is not externally reachable;
- certificate renewal ownership is documented by the host/platform operator.

## Limits

- This handoff does not create certificates.
- This handoff does not configure a concrete reverse proxy product.
- This handoff does not replace managed secret or host preflight validation.
- Full browser-level pilot smoke through the external route remains a later acceptance option.
