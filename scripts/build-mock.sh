set -euo pipefail

REGISTRY="${DOCKER_REGISTRY:-artmendy}"
TAG="${TAG:-latest-mock}"
DO_PUSH=false

for arg in "$@"; do
  case $arg in
    --push)   DO_PUSH=true ;;
    --tag=*)  TAG="${arg#*=}" ;;
    --tag)    shift; TAG="$1" ;;
  esac
done

FRONTEND_IMAGE="${REGISTRY}/frontend:${TAG}"
BACKEND_IMAGE="${REGISTRY}/api-gateway:${TAG}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "============================================"
echo "  Build modo MOCK (sem Keycloak client)"
echo "  Frontend : ${FRONTEND_IMAGE}"
echo "  Backend  : ${BACKEND_IMAGE}"
echo "  Push     : ${DO_PUSH}"
echo "============================================"
echo ""

echo ">>> [1/2] Build do frontend (VITE_AUTH_MOCK=true)..."
docker build \
  --file "${ROOT_DIR}/frontend/Dockerfile" \
  --build-arg VITE_AUTH_MOCK=true \
  --build-arg VITE_API_GATEWAY_URL=/grupo4/api \
  --build-arg VITE_KEYCLOAK_REALM=grupo04 \
  --tag "${FRONTEND_IMAGE}" \
  "${ROOT_DIR}/frontend"
echo "    ✅ ${FRONTEND_IMAGE}"

echo ""
echo ">>> [2/2] Build do backend..."
docker build \
  --file "${ROOT_DIR}/backend/Dockerfile" \
  --tag "${BACKEND_IMAGE}" \
  "${ROOT_DIR}"
echo "    ✅ ${BACKEND_IMAGE}"
echo ""

if [ "${DO_PUSH}" = "true" ]; then
  echo ">>> Push para ${REGISTRY}..."
  docker push "${FRONTEND_IMAGE}"
  docker push "${BACKEND_IMAGE}"
  echo ""
  echo ">>> Para aplicar no cluster com JWT_MOCK=true:"
  echo "    KUBE=\"--kubeconfig=.kube/kubeconfig-grupo-4.yaml\""
  echo "    kubectl set image deployment/frontend   frontend=${FRONTEND_IMAGE}   -n grupo-4 \$KUBE"
  echo "    kubectl set image deployment/api-gateway api-gateway=${BACKEND_IMAGE} -n grupo-4 \$KUBE"
  echo "    kubectl set env deployment/api-gateway JWT_MOCK=true GRPC_MOCK=false -n grupo-4 \$KUBE"
else
  echo ">>> Para fazer push: ./scripts/build-mock.sh --push"
fi
