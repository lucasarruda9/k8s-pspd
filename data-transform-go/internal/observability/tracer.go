// Package observability fornece rastreamento distribuído via OpenTelemetry
// para o DataTransformService (Go). Os spans gerados aqui são propagados
// para o Jaeger, completando o trace end-to-end:
//   Browser → API Gateway → DataTransformService
package observability

import (
	"context"
	"log"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// InitTracer inicializa o SDK do OpenTelemetry.
// Retorna uma função de shutdown que deve ser chamada no encerramento do processo.
func InitTracer() func(context.Context) error {
	otlpURL := os.Getenv("OTLP_COLLECTOR_URL")

	var exporter sdktrace.SpanExporter
	var err error

	if otlpURL != "" {
		exporter, err = otlptracehttp.New(
			context.Background(),
			otlptracehttp.WithEndpoint(otlpURL),
			otlptracehttp.WithInsecure(),
		)
		if err != nil {
			log.Fatalf("[OTel] falha ao criar exporter OTLP: %v", err)
		}
		log.Printf("[OTel] Rastreamento iniciado → Jaeger OTLP (%s)", otlpURL)
	} else {
		// Em dev local, sem Jaeger, usa um exporter que descarta silenciosamente
		exporter = &noopExporter{}
		log.Println("[OTel] Rastreamento iniciado → modo dev (sem exportação)")
	}

	res := resource.NewWithAttributes(
		semconv.SchemaURL,
		semconv.ServiceName("data-transform-go"),
		semconv.ServiceVersion("1.0.0"),
	)

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)

	otel.SetTracerProvider(tp)

	return func(ctx context.Context) error {
		ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		return tp.Shutdown(ctx)
	}
}

// noopExporter descarta spans silenciosamente (usado em dev sem Jaeger)
type noopExporter struct{}

func (n *noopExporter) ExportSpans(_ context.Context, _ []sdktrace.ReadOnlySpan) error {
	return nil
}
func (n *noopExporter) Shutdown(_ context.Context) error { return nil }
