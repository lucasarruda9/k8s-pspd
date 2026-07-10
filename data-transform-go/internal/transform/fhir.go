package transform

import (
	"fmt"
	"strings"
	"time"

	pb "github.com/lucasarruda9/k8s-pspd/data-transform-go/proto"
)

const (
	kindCondition   = "condition"
	kindObservation = "observation"
	kindMedication  = "medication"
)

func eventKind(tipoEvento string) string {
	s := strings.ToLower(tipoEvento)
	switch {
	case strings.Contains(s, "condi"):
		return kindCondition
	case strings.Contains(s, "observ"):
		return kindObservation
	case strings.Contains(s, "medica"):
		return kindMedication
	default:
		return ""
	}
}

func ToFHIRPatient(p *pb.DBPatient, accessLevel string) *pb.FHIRPatient {
	base := &pb.FHIRPatient{ResourceType: "Patient", Gender: p.GetGenero()}

	switch accessLevel {
	case AccessFull:
		base.Id = p.GetIdPaciente()
		base.Name = p.GetNome()
		base.BirthDate = p.GetDataNascimento()
		base.City = p.GetCidade()
		base.State = p.GetEstado()
		base.Cpf = p.GetCpf()
		base.Cns = p.GetCns()

	case AccessPartial:
		base.Id = p.GetIdPaciente()
		base.Name = Initials(p.GetNome())
		base.BirthDate = BirthYear(p.GetDataNascimento())
		base.City = p.GetCidade()
		base.State = p.GetEstado()

	default:
		base.Id = PseudoID(p.GetIdPaciente())
		if age, ok := ComputeAge(p.GetDataNascimento(), time.Now()); ok {
			base.BirthDate = fmt.Sprintf("%d anos", age)
		}
		base.State = p.GetEstado()
	}
	return base
}

func ToFHIREncounter(e *pb.DBEncounter, accessLevel string) *pb.FHIREncounter {
	return &pb.FHIREncounter{
		ResourceType:     "Encounter",
		Id:               e.GetIdAtendimento(),
		SubjectReference: PatientReference(e.GetIdPaciente(), accessLevel),
		Start:            e.GetDataInicio(),
		End:              e.GetDataFim(),
		Type:             e.GetTipoAtendimento(),
		ServiceProvider:  e.GetSetorDepartamento(),
	}
}

type ClinicalResources struct {
	Conditions   []*pb.FHIRCondition
	Observations []*pb.FHIRObservation
	Medications  []*pb.FHIRMedicationRequest
}

func MapClinicalEvents(events []*pb.DBClinicalEvent, accessLevel string) ClinicalResources {
	var res ClinicalResources
	for _, ev := range events {
		switch eventKind(ev.GetTipoEvento()) {
		case kindCondition:
			res.Conditions = append(res.Conditions, &pb.FHIRCondition{
				ResourceType:     "Condition",
				Id:               ev.GetIdEvento(),
				SubjectReference: PatientReference(ev.GetIdPaciente(), accessLevel),
				Code:             ev.GetCodigoTipoEvento(),
				RecordedDate:     ev.GetDataEvento(),
			})
		case kindObservation:
			res.Observations = append(res.Observations, &pb.FHIRObservation{
				ResourceType:     "Observation",
				Id:               ev.GetIdEvento(),
				SubjectReference: PatientReference(ev.GetIdPaciente(), accessLevel),
				Code:             ev.GetCodigoTipoEvento(),
				Value:            ev.GetValor(),
				Unit:             ev.GetUnidadeValor(),
				EffectiveDate:    ev.GetDataEvento(),
			})
		case kindMedication:
			res.Medications = append(res.Medications, &pb.FHIRMedicationRequest{
				ResourceType:     "MedicationRequest",
				Id:               ev.GetIdEvento(),
				SubjectReference: PatientReference(ev.GetIdPaciente(), accessLevel),
				MedicationCode:   ev.GetCodigoTipoEvento(),
				AuthoredOn:       ev.GetDataEvento(),
			})
		}
	}
	return res
}

func BuildTransformResponse(req *pb.TransformRequest) *pb.TransformResponse {
	level := req.GetAccessLevel()
	cr := MapClinicalEvents(req.GetRawEvents(), level)

	resp := &pb.TransformResponse{
		Conditions:   cr.Conditions,
		Observations: cr.Observations,
		Medications:  cr.Medications,
	}
	for _, p := range req.GetRawPatients() {
		resp.Patients = append(resp.Patients, ToFHIRPatient(p, level))
	}
	for _, e := range req.GetRawEncounters() {
		resp.Encounters = append(resp.Encounters, ToFHIREncounter(e, level))
	}
	return resp
}
