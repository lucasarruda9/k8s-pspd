#!/usr/bin/env bash
set -euo pipefail

KUBECONFIG_FLAG=""
if [ -f ".kube/kubeconfig-grupo-4.yaml" ]; then
    KUBECONFIG_FLAG="--kubeconfig=.kube/kubeconfig-grupo-4.yaml"
    echo "[modo remoto] Usando cluster da UnB (grupo-04)"
else
    echo "[modo local] Nenhum kubeconfig encontrado, usando contexto padrão do kubectl"
fi

echo "[1/3] Aplicando base (namespace + secrets)..."
kubectl $KUBECONFIG_FLAG apply -f k8s/base/namespace.yaml
kubectl $KUBECONFIG_FLAG apply -f k8s/base/secrets.yaml

echo "[2/3] Aplicando observabilidade (Jaeger + Loki + Alertmanager)..."
kubectl $KUBECONFIG_FLAG apply -f k8s/observability/jaeger.yaml
kubectl $KUBECONFIG_FLAG apply -f k8s/observability/loki-promtail.yaml
kubectl $KUBECONFIG_FLAG apply -f k8s/observability/alertmanager.yaml

echo "[3/3] Subindo microsserviços..."
kubectl $KUBECONFIG_FLAG apply -f k8s/services/

echo ""
echo "Deploy concluído. Para acompanhar os pods:"
echo "  kubectl $KUBECONFIG_FLAG get pods -n grupo-04 -w"
echo ""
echo "Para rodar os testes de carga (gateway deve estar em pé):"
echo "  GATEWAY_URL=http://<IP_EXTERNO>:8080 k6 run load-tests/k6-stress-test.js"
