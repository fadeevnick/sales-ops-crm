# MVP Pilot Reverse Proxy/TLS Handoff Review Note

## Slice

Reverse proxy and TLS handoff baseline.

## Outcome

```text
accepted on local route validation sanity check
```

## Implemented

- Added `codebase/deploy/REVERSE_PROXY_TLS_HANDOFF.md`.
- Added `codebase/scripts/reverse-proxy-tls-check.sh`.
- Updated `codebase/deploy/SINGLE_NODE_HOST_IAC.md`.
- Updated `codebase/deploy/EXTERNAL_STAGING_HANDOFF.md`.
- Updated `codebase/DEPLOYMENT.md`.
- Updated `codebase/scripts/staging-handoff-check.sh`.
- Updated `codebase/README.md`.
- Updated `implementation_status.md`.
- Updated `design_status.md`.

## Boundary

This slice defines the host/platform proxy contract without choosing a proxy product.

It does not add:

- nginx/Caddy/Traefik/HAProxy config;
- certificate provisioning automation;
- DNS automation;
- cloud load balancer resources;
- Kubernetes ingress resources.

## Verification

Expected checks:

```bash
bash -n scripts/reverse-proxy-tls-check.sh scripts/staging-handoff-check.sh
scripts/staging-handoff-check.sh
REVERSE_PROXY_TLS_ALLOW_INSECURE=1 scripts/reverse-proxy-tls-check.sh /tmp/salesops-local-route.env
curl -fsS http://127.0.0.1:8081/readyz
```

The route validation sanity check uses insecure localhost URLs only for the active local dev runtime. Remote staging/production checks require HTTPS by default.

## Remaining Gaps

- no concrete reverse proxy config is committed;
- no certificate automation exists;
- no DNS/provider-specific routing exists;
- full external-route pilot smoke remains a later acceptance option.

## Next Step

Choose the next deployment maturity slice:

```text
image registry promotion baseline or provider-specific secret integration
```
