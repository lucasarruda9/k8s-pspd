package main

import (
	"context"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/mockdata"
	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/observability"
	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/statistics"
	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/transform"
	pb "github.com/lucasarruda9/k8s-pspd/data-transform-go/proto"
)

type server struct {
	pb.UnimplementedDataTransformServiceServer
}

var validTransformLevels = map[string]bool{
	transform.AccessFull:       true,
	transform.AccessPartial:    true,
	transform.AccessAnonymized: true,
}

func (s *server) TransformToFHIR(_ context.Context, req *pb.TransformRequest) (*pb.TransformResponse, error) {
	if !validTransformLevels[req.GetAccessLevel()] {
		return nil, status.Errorf(codes.InvalidArgument,
			"access_level inválido para transformação: %q", req.GetAccessLevel())
	}
	resp := transform.BuildTransformResponse(req)

	level := req.GetAccessLevel()
	observability.FHIRResources.WithLabelValues("Patient", level).Add(float64(len(resp.Patients)))
	observability.FHIRResources.WithLabelValues("Encounter", level).Add(float64(len(resp.Encounters)))
	observability.FHIRResources.WithLabelValues("Condition", level).Add(float64(len(resp.Conditions)))
	observability.FHIRResources.WithLabelValues("Observation", level).Add(float64(len(resp.Observations)))
	observability.FHIRResources.WithLabelValues("MedicationRequest", level).Add(float64(len(resp.Medications)))

	log.Printf("TransformToFHIR: level=%s patients=%d conditions=%d observations=%d medications=%d",
		level, len(resp.Patients), len(resp.Conditions), len(resp.Observations), len(resp.Medications))
	return resp, nil
}

func (s *server) GetCohortStatistics(_ context.Context, req *pb.StatisticsRequest) (*pb.StatisticsResponse, error) {
	patients, events := mockdata.FetchCohortForStatistics(req.GetProjectId())
	resp := statistics.Build(patients, events)
	log.Printf("GetCohortStatistics: project=%s total_patients=%d", req.GetProjectId(), resp.TotalPatients)
	return resp, nil
}

func main() {
	addr := ":" + envOr("TRANSFORM_PORT", "50053")
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("falha ao escutar em %s: %v", addr, err)
	}

	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(observability.UnaryMetricsInterceptor))
	pb.RegisterDataTransformServiceServer(grpcServer, &server{})

	metricsAddr := ":" + envOr("METRICS_PORT", "9103")
	observability.StartMetricsServer(metricsAddr)
	log.Printf("métricas Prometheus em %s/metrics", metricsAddr)

	go func() {
		sigs := make(chan os.Signal, 1)
		signal.Notify(sigs, syscall.SIGTERM, syscall.SIGINT)
		sig := <-sigs
		log.Printf("sinal %v recebido: encerrando graciosamente...", sig)
		grpcServer.GracefulStop()
	}()

	log.Printf("DataTransformService (Go) ouvindo em %s", addr)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("erro ao servir gRPC: %v", err)
	}
	log.Println("servidor encerrado")
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
