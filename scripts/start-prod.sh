#!/usr/bin/env sh
# Start the standalone Next.js server for Railway. Migrations run in railway.toml
# preDeployCommand, so by the time this runs the schema is ready.

# Railway sets HOSTNAME to the container id; Next.js standalone uses it as the
# bind address, which breaks the healthcheck. Force 0.0.0.0.
export HOSTNAME=0.0.0.0

exec node .next/standalone/server.js
