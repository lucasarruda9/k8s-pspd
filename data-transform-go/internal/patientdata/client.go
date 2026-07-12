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

func Dial(addr string) (*Client, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	return &Client{conn: conn, svc: pb.NewPatientDataServiceClient(conn)}, nil
}

type Cohort struct {
	Patients   []*pb.DBPatient
	Encounters []*pb.DBEncounter
	Events     []*pb.DBClinicalEvent
}

func (c *Client) FetchCohort(ctx context.Context, projectID string) (*Cohort, error) {
	resp, err := c.svc.FetchCohortData(ctx, &pb.CohortQueryRequest{ProjectId: projectID})
	if err != nil {
		return nil, err
	}
	return &Cohort{
		Patients:   resp.GetPatients(),
		Encounters: resp.GetEncounters(),
		Events:     resp.GetRelevantEvents(),
	}, nil
}

func (c *Client) Close() error {
	return c.conn.Close()
}
