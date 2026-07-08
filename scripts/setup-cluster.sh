#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Criando cluser Kind..."
kind create cluster --config k8s/cluster/kind-config.yaml

echo "[2/4] Aplicando base (namespace + secrtes)..."
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/secrets.yaml

echo "[3/4] Subindo promethues e grafana..."
kubectl apply -f k8s/observability/prometheus.yaml
kubectl apply -f k8s/observability/grafana.yaml

# sobe os servicos (imagens placeholder - substituir quando backend exister)
echo "[4/4] Subindo servicos..."
kubectl apply -f k8s/services/

echo ""
echo "Cluster pronto. pra expor o Grafana localmente:"
echo "  kubectl port-forward -n pspd svc/grafana 3000:3000"
echo ""
echo "pra rodar os teste de carga (backend tem q ta em pe):"
echo "  GATEWAY_URL=http://localhost:8080 k6 run load-tests/k6-stress-test.js"
