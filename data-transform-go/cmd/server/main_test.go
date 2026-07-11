package main

import (
	"context"
	"net"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"

	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/mockdata"
	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/transform"
	pb "github.com/lucasarruda9/k8s-pspd/data-transform-go/proto"
)

type fakeCohorts struct{}

func (fakeCohorts) FetchCohort(_ context.Context, projectID string) ([]*pb.DBPatient, []*pb.DBClinicalEvent, error) {
	p, e := mockdata.FetchCohortForStatistics(projectID)
	return p, e, nil
}

func setup(t *testing.T) (pb.DataTransformServiceClient, func()) {
	t.Helper()
	lis := bufconn.Listen(1024 * 1024)
	s := grpc.NewServer()
	pb.RegisterDataTransformServiceServer(s, &server{cohorts: fakeCohorts{}})
	go func() { _ = s.Serve(lis) }()

	conn, err := grpc.NewClient("passthrough:///bufnet",
		grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) { return lis.Dial() }),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	return pb.NewDataTransformServiceClient(conn), func() { conn.Close(); s.Stop() }
}

func TestE2E_TransformToFHIR_Anonymized(t *testing.T) {
	client, teardown := setup(t)
	defer teardown()

	resp, err := client.TransformToFHIR(context.Background(), &pb.TransformRequest{
		AccessLevel: "ANONYMIZED",
		RawPatients: []*pb.DBPatient{
			{IdPaciente: "P000001", Nome: "João da Silva", DataNascimento: "1968-05-10", Genero: "male", Cidade: "Brasília", Estado: "DF", Cpf: "123.456.789-00", Cns: "700000000000001"},
		},
		RawEvents: []*pb.DBClinicalEvent{
			{IdEvento: "EV1", IdPaciente: "P000001", TipoEvento: "Condição", CodigoTipoEvento: "Diabetes"},
			{IdEvento: "EV2", IdPaciente: "P000001", TipoEvento: "Observação", CodigoTipoEvento: "Glicemia", Valor: "182"},
		},
	})
	if err != nil {
		t.Fatalf("RPC erro: %v", err)
	}
	p := resp.Patients[0]
	if p.Name != "" || p.Cpf != "" || p.Id == "P000001" {
		t.Errorf("dados não anonimizados: %+v", p)
	}
	if len(resp.Conditions) != 1 || len(resp.Observations) != 1 {
		t.Errorf("roteamento FHIR incorreto: %d cond, %d obs", len(resp.Conditions), len(resp.Observations))
	}
	if resp.Conditions[0].SubjectReference != "Patient/"+transform.PseudoID("P000001") {
		t.Errorf("referência deveria usar pseudo-ID: %q", resp.Conditions[0].SubjectReference)
	}
}

func TestE2E_TransformToFHIR_LevelInvalido(t *testing.T) {
	client, teardown := setup(t)
	defer teardown()

	_, err := client.TransformToFHIR(context.Background(), &pb.TransformRequest{AccessLevel: "SUPER_ADMIN"})
	if err == nil {
		t.Fatal("access_level inválido deveria retornar erro")
	}
}

func TestE2E_GetCohortStatistics(t *testing.T) {
	client, teardown := setup(t)
	defer teardown()

	resp, err := client.GetCohortStatistics(context.Background(), &pb.StatisticsRequest{ProjectId: "PRJ01"})
	if err != nil {
		t.Fatalf("RPC erro: %v", err)
	}
	if resp.TotalPatients == 0 || len(resp.SampleExams) == 0 {
		t.Errorf("estatísticas vazias: %+v", resp)
	}
}
