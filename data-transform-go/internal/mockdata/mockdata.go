// Package mockdata substitui temporariamente o acesso ao banco/PatientDataService
// para o RPC GetCohortStatistics.
package mockdata

import (
	"strings"

	pb "github.com/lucasarruda9/k8s-pspd/data-transform-go/proto"
)

var projects = map[string]string{
	"PRJ01": "Diabetes",
	"PRJ02": "Hipertensão",
}

var patients = []*pb.DBPatient{
	{IdPaciente: "P000001", Nome: "João da Silva", DataNascimento: "1968-05-10", Genero: "male", Cidade: "Brasília", Estado: "DF", Cpf: "123.456.789-00", Cns: "700000000000001"},
	{IdPaciente: "P000002", Nome: "Maria Oliveira", DataNascimento: "1962-11-23", Genero: "female", Cidade: "Goiânia", Estado: "GO", Cpf: "234.567.890-11", Cns: "700000000000002"},
	{IdPaciente: "P000003", Nome: "Ana Pereira", DataNascimento: "1985-02-17", Genero: "female", Cidade: "Brasília", Estado: "DF", Cpf: "345.678.901-22", Cns: "700000000000003"},
	{IdPaciente: "P000004", Nome: "Carlos Souza", DataNascimento: "1959-07-30", Genero: "male", Cidade: "Anápolis", Estado: "GO", Cpf: "456.789.012-33", Cns: "700000000000004"},
}

var clinicalEvents = []*pb.DBClinicalEvent{
	{IdEvento: "EV0001", IdPaciente: "P000001", TipoEvento: "Condição", CodigoTipoEvento: "Diabetes", DescricaoEvento: "Diabetes Mellitus Tipo 2", DataEvento: "2023-02-10"},
	{IdEvento: "EV0002", IdPaciente: "P000001", TipoEvento: "Observação", CodigoTipoEvento: "Glicemia", DataEvento: "2024-04-18", Valor: "182", UnidadeValor: "mg/dL"},
	{IdEvento: "EV0003", IdPaciente: "P000001", TipoEvento: "Observação", CodigoTipoEvento: "HbA1c", DataEvento: "2024-04-18", Valor: "8.1", UnidadeValor: "%"},
	{IdEvento: "EV0004", IdPaciente: "P000001", TipoEvento: "Medicação", CodigoTipoEvento: "Metformina", DataEvento: "2024-04-18", Valor: "850", UnidadeValor: "mg"},
	{IdEvento: "EV0005", IdPaciente: "P000002", TipoEvento: "Condição", CodigoTipoEvento: "Diabetes", DescricaoEvento: "Diabetes Mellitus Tipo 2", DataEvento: "2022-09-01"},
	{IdEvento: "EV0006", IdPaciente: "P000002", TipoEvento: "Condição", CodigoTipoEvento: "Hipertensão", DescricaoEvento: "Hipertensão Arterial", DataEvento: "2023-01-15"},
	{IdEvento: "EV0007", IdPaciente: "P000002", TipoEvento: "Observação", CodigoTipoEvento: "HbA1c", DataEvento: "2024-05-02", Valor: "7.2", UnidadeValor: "%"},
	{IdEvento: "EV0008", IdPaciente: "P000002", TipoEvento: "Medicação", CodigoTipoEvento: "Losartana", DataEvento: "2024-05-02", Valor: "50", UnidadeValor: "mg"},
	{IdEvento: "EV0009", IdPaciente: "P000003", TipoEvento: "Condição", CodigoTipoEvento: "Diabetes", DescricaoEvento: "Diabetes Mellitus Tipo 2", DataEvento: "2024-06-10"},
	{IdEvento: "EV0010", IdPaciente: "P000003", TipoEvento: "Observação", CodigoTipoEvento: "Glicemia", DataEvento: "2024-06-10", Valor: "150", UnidadeValor: "mg/dL"},
	{IdEvento: "EV0011", IdPaciente: "P000003", TipoEvento: "Observação", CodigoTipoEvento: "IMC", DataEvento: "2024-06-10", Valor: "31.2", UnidadeValor: "kg/m2"},
	{IdEvento: "EV0012", IdPaciente: "P000004", TipoEvento: "Condição", CodigoTipoEvento: "Hipertensão", DescricaoEvento: "Hipertensão Arterial", DataEvento: "2023-11-20"},
	{IdEvento: "EV0013", IdPaciente: "P000004", TipoEvento: "Medicação", CodigoTipoEvento: "Losartana", DataEvento: "2024-03-21", Valor: "50", UnidadeValor: "mg"},
}

func FetchCohortForStatistics(projectID string) (cohortPatients []*pb.DBPatient, cohortEvents []*pb.DBClinicalEvent) {
	conditionCode, ok := projects[projectID]
	if !ok {
		return nil, nil
	}

	inCohort := map[string]bool{}
	for _, ev := range clinicalEvents {
		if strings.Contains(strings.ToLower(ev.GetTipoEvento()), "condi") &&
			ev.GetCodigoTipoEvento() == conditionCode {
			inCohort[ev.GetIdPaciente()] = true
		}
	}

	for _, p := range patients {
		if inCohort[p.GetIdPaciente()] {
			cohortPatients = append(cohortPatients, p)
		}
	}
	for _, ev := range clinicalEvents {
		if inCohort[ev.GetIdPaciente()] {
			cohortEvents = append(cohortEvents, ev)
		}
	}
	return cohortPatients, cohortEvents
}
