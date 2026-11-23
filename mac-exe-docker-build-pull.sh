#!/usr/bin/env bash
#
# STMX Biz Web (vtron) - Docker Hub build & push / pull   (macOS + Linux)
#
#   ./mac-exe-docker-build-pull.sh              build + push  (default, tag=latest)
#   ./mac-exe-docker-build-pull.sh push v1.0.2  build + push with an explicit tag
#   ./mac-exe-docker-build-pull.sh pull         login + pull the remote image
#   ./mac-exe-docker-build-pull.sh pull v1.0.2  login + pull a specific tag
#
# Credentials are read from .env.docker (preferred) or .env:
#   DOCKER_USER
#   DOCKER_STMX_ACCESS_TOKEN | DOCKERHUB_TOKEN | DOCKER_USER_PASSWORD | DOCKER_PASSWORD
#
# Use a Docker Hub access token, not the account password:
#   https://app.docker.com/settings/personal-access-tokens

set -euo pipefail

IMAGE_NAME="stmx-biz-web"
DEFAULT_USER="arasu007"

# The DigitalOcean droplet is x86_64. Apple Silicon would otherwise produce an
# arm64 image that cannot run there, so pin the target platform. Override with
# PLATFORM=linux/arm64 ./mac-exe-docker-build-pull.sh
PLATFORM="${PLATFORM:-linux/amd64}"

# always run from the directory this script lives in (= project root)
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------- args ----------
MODE="push"
case "${1:-}" in
  push|pull) MODE="$1"; shift ;;
  -h|--help)
    awk 'NR>1 && /^#/ { sub(/^# ?/, ""); print; next } NR>1 { exit }' "$0"
    exit 0 ;;
esac
TAG="${1:-latest}"

# ---------- helpers ----------
c_red()  { printf '\033[31m%s\033[0m\n' "$*"; }
c_grn()  { printf '\033[32m%s\033[0m\n' "$*"; }
c_dim()  { printf '\033[2m%s\033[0m\n' "$*"; }
die()    { c_red "[ERROR] $*"; exit 1; }

# strip CR (the .env files may be CRLF), surrounding quotes and outer whitespace
clean_val() {
  local v="$1"
  v="${v%$'\r'}"
  v="${v#"${v%%[![:space:]]*}"}"
  v="${v%"${v##*[![:space:]]}"}"
  case "$v" in
    \"*\") v="${v:1:${#v}-2}" ;;
    \'*\') v="${v:1:${#v}-2}" ;;
  esac
  printf '%s' "$v"
}

# env_get <file> <key>  -> value on stdout, empty if absent
env_get() {
  local file="$1" key="$2" line
  [ -f "$file" ] || return 0
  line="$(grep -m1 -E "^[[:space:]]*${key}[[:space:]]*=" "$file" 2>/dev/null || true)"
  [ -n "$line" ] || return 0
  clean_val "${line#*=}"
}

# ---------- credentials ----------
DOCKER_USER="${DOCKER_USER:-}"
DOCKER_SECRET=""
CRED_SOURCE=""

for f in .env.docker .env; do
  [ -f "$f" ] || continue
  [ -z "$DOCKER_USER" ] && DOCKER_USER="$(env_get "$f" DOCKER_USER)"
  if [ -z "$DOCKER_SECRET" ]; then
    for k in DOCKER_STMX_ACCESS_TOKEN DOCKERHUB_TOKEN DOCKER_USER_PASSWORD DOCKER_PASSWORD; do
      DOCKER_SECRET="$(env_get "$f" "$k")"
      [ -n "$DOCKER_SECRET" ] && { CRED_SOURCE="$f [$k]"; break; }
    done
  fi
done
[ -n "$DOCKER_USER" ] || DOCKER_USER="$DEFAULT_USER"

LOCAL_IMAGE="${IMAGE_NAME}:${TAG}"
REMOTE_IMAGE="${DOCKER_USER}/${IMAGE_NAME}:${TAG}"

echo "============================================================"
echo "  mode          : $MODE"
echo "  build context : $PWD"
echo "  platform      : $PLATFORM"
echo "  local image   : $LOCAL_IMAGE"
echo "  remote image  : $REMOTE_IMAGE"
[ -n "$CRED_SOURCE" ] && echo "  credentials   : $CRED_SOURCE"
echo "============================================================"
echo

# ---------- pre-flight ----------
command -v docker >/dev/null 2>&1 || die '"docker" not found on PATH. Install / start Docker Desktop.'
docker info >/dev/null 2>&1     || die 'Docker daemon is not responding. Start Docker Desktop and retry.'

# ---------- login ----------
do_login() {
  if [ -n "$DOCKER_SECRET" ]; then
    echo "[login] docker login -u $DOCKER_USER  (token from env file)"
    # printf without a trailing newline; --password-stdin takes the raw value
    printf '%s' "$DOCKER_SECRET" | docker login -u "$DOCKER_USER" --password-stdin \
      || die "docker login failed - check the access token."
  else
    echo "[login] docker login -u $DOCKER_USER  (interactive)"
    docker login -u "$DOCKER_USER" || die "docker login failed."
  fi
  unset DOCKER_SECRET
  echo
}

# ---------- pull mode ----------
if [ "$MODE" = "pull" ]; then
  do_login
  echo "[pull] docker pull --platform $PLATFORM $REMOTE_IMAGE"
  docker pull --platform "$PLATFORM" "$REMOTE_IMAGE" || die "docker pull failed."
  echo
  c_grn "[DONE] pulled $REMOTE_IMAGE"
  c_dim "  next: docker compose up -d"
  exit 0
fi

# ---------- push mode ----------
[ -f Dockerfile ] || die "Dockerfile not found in $PWD"

# NEXT_PUBLIC_* are inlined into the client bundle at BUILD time, so they must
# reach "npm run build" inside the image. Everything else stays out of the
# image - the droplet injects it at runtime via compose env_file.
#
# .env is read first, then .env.docker. Docker uses the LAST --build-arg for a
# repeated key, so .env.docker wins: put build-time overrides there (e.g. a
# different NEXT_PUBLIC_SITE_URL) without touching the app runtime .env.
collect_build_args() {
  local file="$1" raw key val
  [ -f "$file" ] || return 0
  while IFS= read -r raw || [ -n "$raw" ]; do
    raw="${raw%$'\r'}"
    raw="${raw#"${raw%%[![:space:]]*}"}"
    case "$raw" in
      \#*|"") continue ;;
      NEXT_PUBLIC_*=*) ;;
      *) continue ;;
    esac
    key="${raw%%=*}"
    key="${key%"${key##*[![:space:]]}"}"
    val="$(clean_val "${raw#*=}")"
    [ -n "$val" ] || continue
    BUILD_ARGS+=(--build-arg "${key}=${val}")
    echo "  build-arg   : ${key}   [${file}]"
  done < "$file"
}

BUILD_ARGS=()
collect_build_args .env
collect_build_args .env.docker
if [ ${#BUILD_ARGS[@]} -eq 0 ]; then
  c_red "[WARN] No NEXT_PUBLIC_* found - they will be empty in the client bundle."
fi
echo

do_login

echo "[build] docker build --platform $PLATFORM . -t $LOCAL_IMAGE"
if docker buildx version >/dev/null 2>&1; then
  docker buildx build --platform "$PLATFORM" --load -t "$LOCAL_IMAGE" ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} . \
    || die "docker build failed."
else
  docker build --platform "$PLATFORM" -t "$LOCAL_IMAGE" ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} . \
    || die "docker build failed."
fi
echo

echo "[tag]  docker tag $LOCAL_IMAGE $REMOTE_IMAGE"
docker tag "$LOCAL_IMAGE" "$REMOTE_IMAGE" || die "docker tag failed."
echo

echo "[push] docker push $REMOTE_IMAGE"
docker push "$REMOTE_IMAGE" || die "docker push failed."
echo

echo "============================================================"
c_grn "  [DONE] pushed $REMOTE_IMAGE"
echo
echo "  On the droplet (backs up the running image first):"
echo "    cd /root/stmx && ./droplet-deploy.sh deploy"
echo "============================================================"
