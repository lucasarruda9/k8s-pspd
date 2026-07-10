package transform

import (
	"sync"
	"testing"
	"time"

	pb "github.com/lucasarruda9/k8s-pspd/data-transform-go/proto"
)

func paciente() *pb.DBPatient {
	return &pb.DBPatient{
		IdPaciente: "P000001", Nome: "João da Silva", DataNascimento: "1968-05-10",
		Genero: "male", Cidade: "Brasília", Estado: "DF",
		Cpf: "123.456.789-00", Cns: "700000000000001",
	}
}

func TestPseudoID(t *testing.T) {
	id := PseudoID("P000001")
	if id != PseudoID("P000001") {
		t.Fatal("pseudoID deve ser determinístico")
	}
	if id == "P000001" || len(id) != len("hash_")+8 {
		t.Fatalf("formato inesperado: %q", id)
	}
}

func TestInitials(t *testing.T) {
	cases := map[string]string{
		"João da Silva":  "J. S.",
		"Maria Oliveira": "M. O.",
		"":               "",
	}
	for in, want := range cases {
		if got := Initials(in); got != want {
			t.Errorf("Initials(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestComputeAge(t *testing.T) {
	ref := time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC)
	if age, ok := ComputeAge("1968-05-10", ref); !ok || age != 56 {
		t.Errorf("idade = %d, ok=%v; want 56", age, ok)
	}
	if age, ok := ComputeAge("1968-07-10", ref); !ok || age != 55 {
		t.Errorf("aniversário futuro: idade = %d; want 55", age)
	}
	if _, ok := ComputeAge("", ref); ok {
		t.Error("data vazia deveria retornar ok=false")
	}
}

func TestComputeAge_AnoBissexto(t *testing.T) {
	casos := []struct {
		nascimento string
		ref        time.Time
		want       int
	}{
		{"1968-05-10", time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC), 58},
		{"1968-05-10", time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC), 57},
		{"1968-05-10", time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC), 58},
		{"2000-02-29", time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC), 25},
	}
	for _, c := range casos {
		got, ok := ComputeAge(c.nascimento, c.ref)
		if !ok || got != c.want {
			t.Errorf("ComputeAge(%s, %s) = %d; want %d",
				c.nascimento, c.ref.Format("2006-01-02"), got, c.want)
		}
	}
}

func TestMapClinicalEvents_Concorrente(t *testing.T) {
	events := []*pb.DBClinicalEvent{
		{IdEvento: "1", IdPaciente: "P1", TipoEvento: "Condição", CodigoTipoEvento: "Diabetes"},
		{IdEvento: "2", IdPaciente: "P1", TipoEvento: "OBSERVACAO", CodigoTipoEvento: "Glicemia"},
		{IdEvento: "3", IdPaciente: "P1", TipoEvento: "Medicação", CodigoTipoEvento: "Metformina"},
	}
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r := MapClinicalEvents(events, AccessAnonymized)
			if len(r.Conditions) != 1 || len(r.Observations) != 1 || len(r.Medications) != 1 {
				t.Error("roteamento incorreto sob concorrência")
			}
		}()
	}
	wg.Wait()
}

func TestEventKind_BancoEMock(t *testing.T) {
	casos := map[string]string{
		"Condição": kindCondition, "CONDICAO": kindCondition,
		"Observação": kindObservation, "OBSERVACAO": kindObservation,
		"Medicação": kindMedication, "MEDICACAO": kindMedication,
		"Desconhecido": "",
	}
	for in, want := range casos {
		if got := eventKind(in); got != want {
			t.Errorf("eventKind(%q) = %q; want %q", in, got, want)
		}
	}
}

func TestToFHIRPatientFull(t *testing.T) {
	r := ToFHIRPatient(paciente(), AccessFull)
	if r.Name != "João da Silva" || r.Cpf != "123.456.789-00" || r.BirthDate != "1968-05-10" {
		t.Errorf("FULL deveria manter todos os dados: %+v", r)
	}
}

func TestToFHIRPatientPartial(t *testing.T) {
	r := ToFHIRPatient(paciente(), AccessPartial)
	if r.Name != "J. S." || r.BirthDate != "1968" || r.Cpf != "" || r.Cns != "" {
		t.Errorf("PARTIAL: nome=iniciais, ano, sem CPF/CNS. Got: %+v", r)
	}
	if r.City == "" || r.Id != "P000001" {
		t.Errorf("PARTIAL deveria manter cidade e patient_id: %+v", r)
	}
}

func TestToFHIRPatientAnonymized(t *testing.T) {
	r := ToFHIRPatient(paciente(), AccessAnonymized)
	if r.Name != "" || r.Cpf != "" || r.Cns != "" || r.City != "" {
		t.Errorf("ANONYMIZED deveria remover nome/CPF/CNS/cidade: %+v", r)
	}
	if r.Id == "P000001" || r.Id != PseudoID("P000001") {
		t.Errorf("ANONYMIZED deveria usar pseudo-ID: %q", r.Id)
	}
	if r.State != "DF" {
		t.Errorf("estado deveria ser mantido: %q", r.State)
	}
	if len(r.BirthDate) < 5 || r.BirthDate == "1968-05-10" {
		t.Errorf("ANONYMIZED birth_date deveria ser faixa etária: %q", r.BirthDate)
	}
}

func TestMapClinicalEventsRoteamentoComAcento(t *testing.T) {
	events := []*pb.DBClinicalEvent{
		{IdEvento: "1", IdPaciente: "P1", TipoEvento: "Condição", CodigoTipoEvento: "Diabetes"},
		{IdEvento: "2", IdPaciente: "P1", TipoEvento: "Observação", CodigoTipoEvento: "Glicemia", Valor: "182", UnidadeValor: "mg/dL"},
		{IdEvento: "3", IdPaciente: "P1", TipoEvento: "Medicação", CodigoTipoEvento: "Metformina"},
	}
	r := MapClinicalEvents(events, AccessFull)
	if len(r.Conditions) != 1 || len(r.Observations) != 1 || len(r.Medications) != 1 {
		t.Fatalf("roteamento incorreto: cond=%d obs=%d med=%d",
			len(r.Conditions), len(r.Observations), len(r.Medications))
	}
	if r.Observations[0].Value != "182" {
		t.Errorf("valor da observação = %q; want 182", r.Observations[0].Value)
	}
}
