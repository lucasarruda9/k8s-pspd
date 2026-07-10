// Package observability expõe métricas Prometheus do serviço, para coleta pelo
package observability

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"google.golang.org/grpc"
	"google.golang.org/grpc/status"
)

const serviceName = "data-transform-service"

var (
	grpcRequests = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "grpc_requests_total",
		Help: "Total de requisições gRPC recebidas",
	}, []string{"service", "method", "status"})

	grpcLatency = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "grpc_request_duration_seconds",
		Help:    "Latência das requisições gRPC em segundos",
		Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5},
	}, []string{"service", "method"})

	FHIRResources = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "fhir_resources_generated_total",
		Help: "Recursos FHIR gerados por tipo",
	}, []string{"resource_type", "access_level"})
)

func UnaryMetricsInterceptor(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
	start := time.Now()
	resp, err := handler(ctx, req)

	st := "ok"
	if err != nil {
		st = status.Code(err).String()
	}
	grpcRequests.WithLabelValues(serviceName, info.FullMethod, st).Inc()
	grpcLatency.WithLabelValues(serviceName, info.FullMethod).Observe(time.Since(start).Seconds())
	return resp, err
}

func StartMetricsServer(addr string) {
	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	})
	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second, // evita Slowloris (gosec G112)
	}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("servidor de métricas encerrou: %v", err)
		}
	}()
}
