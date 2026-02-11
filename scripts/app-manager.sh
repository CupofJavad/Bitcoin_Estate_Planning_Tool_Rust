#!/usr/bin/env bash
#
# Legacy Vault — startup, manage, and close script
# Run at computer startup or anytime to start/status/stop the app (Docker/Postgres, API, frontend).
# Usage: ./scripts/app-manager.sh   or   bash scripts/app-manager.sh
#

set -e

# ============== CONFIG (edit these if your paths or ports differ) ==============
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT="${LEGACY_VAULT_API_PORT:-8000}"
FRONTEND_PORT="${LEGACY_VAULT_FRONTEND_PORT:-3000}"
DOCKER_COMPOSE_FILE="${REPO_ROOT}/infra/docker-compose.yml"
LOG_DIR="${REPO_ROOT}/.run-logs"
API_LOG="${LOG_DIR}/api.log"
FRONTEND_LOG="${LOG_DIR}/frontend.log"
# Set to 1 to stop Postgres when you choose "Stop app" (0 = leave Postgres running)
STOP_POSTGRES_ON_STOP="${LEGACY_VAULT_STOP_POSTGRES:-0}"
# When Docker isn't running, wait up to this many seconds for it (poll every 5s). Set 0 to skip waiting.
WAIT_FOR_DOCKER_SEC="${LEGACY_VAULT_WAIT_FOR_DOCKER:-90}"
# ===============================================================================

mkdir -p "$LOG_DIR"

# ---- State checks (return 0 if ok/running, 1 otherwise) ----
docker_ok() {
  docker info &>/dev/null
}

postgres_running() {
  [ -f "$DOCKER_COMPOSE_FILE" ] && (cd "$REPO_ROOT" && docker compose -f "$DOCKER_COMPOSE_FILE" ps -q postgres 2>/dev/null) | grep -q .
}

api_running() {
  (lsof -i :"$API_PORT" 2>/dev/null || true) | grep -q LISTEN
}

frontend_running() {
  (lsof -i :"$FRONTEND_PORT" 2>/dev/null || true) | grep -q LISTEN
}

# ---- Start helpers ----
wait_for_docker() {
  if docker_ok; then return 0; fi
  echo "  → Docker is not running. Start Docker Desktop (open the app)."
  if [ "${WAIT_FOR_DOCKER_SEC}" -eq 0 ]; then
    echo "  → Run this script again after Docker is up, or set LEGACY_VAULT_WAIT_FOR_DOCKER=90 to wait automatically."
    return 1
  fi
  echo "  → Waiting up to ${WAIT_FOR_DOCKER_SEC}s for Docker (polling every 5s)..."
  local waited=0
  while [ "$waited" -lt "${WAIT_FOR_DOCKER_SEC}" ]; do
    sleep 5
    waited=$((waited + 5))
    if docker_ok; then
      echo "  → Docker is ready."
      return 0
    fi
    printf "  → %ds ...\n" "$waited"
  done
  echo "  → Docker did not become ready. Start Docker Desktop and run this script again."
  return 1
}

start_postgres() {
  echo "  Starting Postgres (docker compose)..."
  (cd "$REPO_ROOT" && docker compose -f "$DOCKER_COMPOSE_FILE" up -d)
  echo "  Waiting for Postgres to accept connections..."
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if (cd "$REPO_ROOT" && docker compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready -U postgres) &>/dev/null; then
      echo "  Postgres is ready."
      return 0
    fi
    sleep 1
  done
  echo "  Warning: Postgres may still be starting. If the API fails with PoolTimedOut, run the script again in a few seconds."
}

start_api() {
  echo "  Starting API (cargo run) on port $API_PORT..."
  (cd "$REPO_ROOT" && nohup cargo run >> "$API_LOG" 2>&1 &)
  echo "  Waiting for API to listen..."
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    if api_running; then
      echo "  API is up at http://localhost:$API_PORT"
      return 0
    fi
    sleep 1
  done
  echo "  Warning: API may still be compiling or starting. Check $API_LOG"
}

start_frontend() {
  echo "  Starting frontend (npm run dev) on port $FRONTEND_PORT..."
  (cd "$REPO_ROOT/frontend" && nohup npm run dev >> "$FRONTEND_LOG" 2>&1 &)
  echo "  Waiting for frontend to listen..."
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    if frontend_running; then
      echo "  Frontend is up at http://localhost:$FRONTEND_PORT"
      return 0
    fi
    sleep 1
  done
  echo "  Warning: Frontend may still be starting. Check $FRONTEND_LOG"
}

# ---- Stop helpers ----
stop_process_on_port() {
  local port=$1
  local name=$2
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  Stopping $name (port $port)..."
    echo "$pids" | xargs kill 2>/dev/null || true
    sleep 1
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    [ -n "$pids" ] && echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}

stop_postgres() {
  if postgres_running; then
    echo "  Stopping Postgres container..."
    (cd "$REPO_ROOT" && docker compose -f "$DOCKER_COMPOSE_FILE" down)
  fi
}

# ---- Actions ----
do_status() {
  echo ""
  echo "  Component     Status      URL / Note"
  echo "  ---------     ------      -----------"
  if docker_ok; then
    echo "  Docker        running     (daemon up)"
  else
    echo "  Docker        not running Start Docker Desktop"
  fi
  if postgres_running; then
    echo "  Postgres      running     port 5432"
  else
    echo "  Postgres      stopped     (start with menu option 1)"
  fi
  if api_running; then
    echo "  API           running     http://localhost:$API_PORT"
  else
    echo "  API           stopped     (start with menu option 1)"
  fi
  if frontend_running; then
    echo "  Frontend      running     http://localhost:$FRONTEND_PORT"
  else
    echo "  Frontend      stopped     (start with menu option 1)"
  fi
  echo ""
}

do_start() {
  echo ""
  echo "Checking current state and starting what's needed..."
  echo ""

  if ! wait_for_docker; then
    return 1
  fi

  if ! postgres_running; then
    start_postgres
  else
    echo "  Postgres already running."
  fi

  if ! api_running; then
    start_api
  else
    echo "  API already running at http://localhost:$API_PORT"
  fi

  if ! frontend_running; then
    start_frontend
  else
    echo "  Frontend already running at http://localhost:$FRONTEND_PORT"
  fi

  echo ""
  echo "Done. App should be available at http://localhost:$FRONTEND_PORT"
  echo "Logs: API $API_LOG  |  Frontend $FRONTEND_LOG"
  echo ""
}

do_stop() {
  echo ""
  stop_process_on_port "$FRONTEND_PORT" "frontend"
  stop_process_on_port "$API_PORT" "API"
  if [ "$STOP_POSTGRES_ON_STOP" = "1" ]; then
    stop_postgres
  else
    echo "  Postgres left running (set STOP_POSTGRES_ON_STOP=1 to stop it)."
  fi
  echo "  Stopped."
  echo ""
}

do_restart() {
  do_stop
  sleep 2
  do_start
}

# ---- Menu ----
show_menu() {
  echo ""
  echo "  Legacy Vault — App Manager"
  echo "  -------------------------"
  echo "  1) Start app   (Docker/Postgres + API + frontend; only starts what's not running)"
  echo "  2) Status      (show what's running)"
  echo "  3) Stop app   (stop API and frontend; Postgres left running unless configured)"
  echo "  4) Restart    (stop then start)"
  echo "  5) Quit"
  echo ""
  printf "  Choose 1–5: "
}

main() {
  # If an argument is passed, run that action and exit (for non-interactive/startup use)
  case "${1:-}" in
    start)   do_start;   exit $? ;;
    status) do_status;  exit 0 ;;
    stop)   do_stop;    exit 0 ;;
    restart) do_restart; exit $? ;;
  esac

  # Interactive menu
  while true; do
    show_menu
    read -r choice
    case "$choice" in
      1) do_start ;;
      2) do_status ;;
      3) do_stop ;;
      4) do_restart ;;
      5) echo "  Bye."; exit 0 ;;
      *) echo "  Invalid option. Choose 1–5." ;;
    esac
  done
}

main "$@"
