#!/usr/bin/env bash
set -euo pipefail

REGISTRY="registry.faest.xyz"
API_IMAGE="${REGISTRY}/stocky/api"
FRONTEND_IMAGE="${REGISTRY}/stocky/frontend"

# ─── Required env vars ──────────────────────────────────────────────────────
# REGISTRY_USER      — registry username
# REGISTRY_PASSWORD  — registry password
# DEPLOY_HOST        — remote server (e.g. user@1.2.3.4 or deploy@stocky.faest.xyz)
# DEPLOY_DIR         — working directory on the remote server
# DEPLOY_KEY         — path to SSH private key (default: ~/.ssh/id_rsa)

: "${REGISTRY_USER:?REGISTRY_USER is required}"
: "${REGISTRY_PASSWORD:?REGISTRY_PASSWORD is required}"
: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_DIR:?DEPLOY_DIR is required}"

DEPLOY_KEY="${DEPLOY_KEY:-${HOME}/.ssh/id_rsa}"

# Tag with git commit SHA + latest
GIT_SHA=$(git rev-parse --short HEAD)
TAGS=("${GIT_SHA}" "latest")

# ─── Parse flags ────────────────────────────────────────────────────────────
PUSH=true
BUILD=true
DEPLOY=true

for arg in "$@"; do
  case $arg in
    --no-push)      PUSH=false ;;
    --no-build)     BUILD=false ;;
    --no-deploy)    DEPLOY=false ;;
    --api-only)     FRONTEND_ONLY=false; API_ONLY=true ;;
    --frontend-only) API_ONLY=false; FRONTEND_ONLY=true ;;
  esac
done

API_ONLY=${API_ONLY:-false}
FRONTEND_ONLY=${FRONTEND_ONLY:-false}

SSH_OPTS=(-i "${DEPLOY_KEY}" -o StrictHostKeyChecking=no -o BatchMode=yes)

# ─── Login ──────────────────────────────────────────────────────────────────
if [[ "${PUSH}" == true ]]; then
  echo "→ Logging in to ${REGISTRY}"
  echo "${REGISTRY_PASSWORD}" | docker login "${REGISTRY}" -u "${REGISTRY_USER}" --password-stdin
fi

# ─── Build backend ──────────────────────────────────────────────────────────
if [[ "${BUILD}" == true && "${FRONTEND_ONLY}" != true ]]; then
  echo "→ Building API image"
  docker build \
    --platform linux/amd64 \
    -t "${API_IMAGE}:${GIT_SHA}" \
    -t "${API_IMAGE}:latest" \
    ./backend
fi

# ─── Build frontend ─────────────────────────────────────────────────────────
if [[ "${BUILD}" == true && "${API_ONLY}" != true ]]; then
  echo "→ Building frontend image"
  docker build \
    --platform linux/amd64 \
    --build-arg NEXT_PUBLIC_API_URL="https://stocky.faest.xyz" \
    -t "${FRONTEND_IMAGE}:${GIT_SHA}" \
    -t "${FRONTEND_IMAGE}:latest" \
    ./frontend
fi

# ─── Push ───────────────────────────────────────────────────────────────────
if [[ "${PUSH}" == true ]]; then
  if [[ "${FRONTEND_ONLY}" != true ]]; then
    echo "→ Pushing API image (${GIT_SHA}, latest)"
    for tag in "${TAGS[@]}"; do
      docker push "${API_IMAGE}:${tag}"
    done
  fi

  if [[ "${API_ONLY}" != true ]]; then
    echo "→ Pushing frontend image (${GIT_SHA}, latest)"
    for tag in "${TAGS[@]}"; do
      docker push "${FRONTEND_IMAGE}:${tag}"
    done
  fi
fi

echo "✓ Images pushed — ${API_IMAGE}:${GIT_SHA} / ${FRONTEND_IMAGE}:${GIT_SHA}"

# ─── Deploy ─────────────────────────────────────────────────────────────────
if [[ "${DEPLOY}" == true && "${PUSH}" == true ]]; then
  echo "→ Copying config files to ${DEPLOY_HOST}:${DEPLOY_DIR}"
  ssh "${SSH_OPTS[@]}" "${DEPLOY_HOST}" mkdir -p "${DEPLOY_DIR}"
  scp -i "${DEPLOY_KEY}" -o StrictHostKeyChecking=no \
    .env.production \
    docker-compose.prod.yml \
    "${DEPLOY_HOST}:${DEPLOY_DIR}/"

  echo "→ Connecting to ${DEPLOY_HOST} and deploying"
  ssh "${SSH_OPTS[@]}" "${DEPLOY_HOST}" bash -s -- \
    "${DEPLOY_DIR}" "${REGISTRY}" "${REGISTRY_USER}" "${REGISTRY_PASSWORD}" "${GIT_SHA}" \
    <<'REMOTE'
set -euo pipefail
DEPLOY_DIR="$1"
REGISTRY="$2"
REGISTRY_USER="$3"
REGISTRY_PASSWORD="$4"
GIT_SHA="$5"

cd "${DEPLOY_DIR}"

echo "  · Logging in to registry"
echo "${REGISTRY_PASSWORD}" | docker login "${REGISTRY}" -u "${REGISTRY_USER}" --password-stdin

echo "  · Pulling images (${GIT_SHA})"
IMAGE_TAG="${GIT_SHA}" docker compose -f docker-compose.prod.yml --env-file .env.production pull

echo "  · Restarting services"
IMAGE_TAG="${GIT_SHA}" docker compose -f docker-compose.prod.yml --env-file .env.production up -d --remove-orphans

echo "  · Pruning old images"
docker image prune -f

echo "✓ Deploy complete"
REMOTE
fi
