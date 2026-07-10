// Package patientdata é um cliente gRPC do PatientDataService (Node), usado
// para obter a coorte de um projeto quando o pesquisador pede estatísticas.
// É a demonstração prática do gRPC poliglota: este serviço Go é cliente de um
// serviço Node, ambos falando o mesmo proto/sistema.proto.
package patientdata

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/lucasarruda9/k8s-pspd/data-transform-go/proto"
)

type Client struct {
	conn *grpc.ClientConn
	svc  pb.PatientDataServiceClient
}

// Dial cria o cliente. A conexão é lazy (só conecta na primeira chamada), então
// não falha aqui se o PatientDataService ainda não estiver de pé.
func Dial(addr string) (*Client, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	return &Client{conn: conn, svc: pb.NewPatientDataServiceClient(conn)}, nil
}

// FetchCohort busca os pacientes e eventos da coorte de um projeto.
func (c *Client) FetchCohort(ctx context.Context, projectID string) ([]*pb.DBPatient, []*pb.DBClinicalEvent, error) {
	resp, err := c.svc.FetchCohortData(ctx, &pb.CohortQueryRequest{ProjectId: projectID})
	if err != nil {
		return nil, nil, err
	}
	return resp.GetPatients(), resp.GetRelevantEvents(), nil
}

func (c *Client) Close() error {
	return c.conn.Close()
}
