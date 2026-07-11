package main

import (
	"context"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"

	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.opentelemetry.io/otel"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/observability"
	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/patientdata"
	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/statistics"
	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/transform"
	pb "github.com/lucasarruda9/k8s-pspd/data-transform-go/proto"
)

type cohortFetcher interface {
	FetchCohort(ctx context.Context, projectID string) ([]*pb.DBPatient, []*pb.DBClinicalEvent, error)
}

type server struct {
	pb.UnimplementedDataTransformServiceServer
	cohorts cohortFetcher
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

func (s *server) GetCohortStatistics(ctx context.Context, req *pb.StatisticsRequest) (*pb.StatisticsResponse, error) {
	patients, events, err := s.cohorts.FetchCohort(ctx, req.GetProjectId())
	if err != nil {
		return nil, status.Errorf(codes.Unavailable,
			"falha ao buscar coorte no PatientDataService: %v", err)
	}
	resp := statistics.Build(patients, events)
	log.Printf("GetCohortStatistics: project=%s total_patients=%d", req.GetProjectId(), resp.TotalPatients)
	return resp, nil
}

func main() {
	// Inicializa OpenTelemetry — deve ser a primeira coisa no main
	shutdownTracer := observability.InitTracer()
	defer func() {
		if err := shutdownTracer(context.Background()); err != nil {
			log.Printf("[OTel] erro ao encerrar tracer: %v", err)
		}
	}()
	tracer := otel.Tracer("data-transform-go")
	_ = tracer // disponível para uso manual em handlers futuros

	addr := ":" + envOr("TRANSFORM_PORT", "50053")
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("falha ao escutar em %s: %v", addr, err)
	}

	patAddr := envOr("PATIENT_DATA_ADDR", "localhost:50052")
	patClient, err := patientdata.Dial(patAddr)
	if err != nil {
		log.Fatalf("falha ao criar cliente do PatientDataService (%s): %v", patAddr, err)
	}
	defer patClient.Close()
	log.Printf("PatientDataService em %s (fonte das coortes)", patAddr)

	// gRPC com interceptors: métricas Prometheus + rastreamento OTel
	grpcServer := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			observability.UnaryMetricsInterceptor,
			otelgrpc.UnaryServerInterceptor(),
		),
	)
	pb.RegisterDataTransformServiceServer(grpcServer, &server{cohorts: patClient})

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
