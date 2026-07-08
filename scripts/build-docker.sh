#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s [build|up|migrate|seed|down] [docker compose args...]\n' "$0"
}

command_name="${1:-build}"
if [ "$#" -gt 0 ]; then
  shift
fi

case "$command_name" in
  build)
    docker compose build "$@"
    ;;
  up)
    docker compose up -d --build "$@"
    ;;
  migrate)
    docker compose run --rm migrate "$@"
    ;;
  seed)
    docker compose --profile tools run --rm seed "$@"
    ;;
  down)
    docker compose down "$@"
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac
