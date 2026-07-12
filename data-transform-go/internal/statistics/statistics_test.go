package statistics

import (
	"regexp"
	"strings"
	"testing"

	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/mockdata"
	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/transform"
)

func TestBuildCoorteDiabetes(t *testing.T) {
	patients, events := mockdata.FetchCohortForStatistics("PRJ01")
	stats := Build(patients, nil, events)

	if stats.TotalPatients == 0 {
		t.Fatal("coorte de Diabetes deveria ter pacientes")
	}
	if !regexp.MustCompile(`% F \| .*% M`).MatchString(stats.GenderDistribution) {
		t.Errorf("distribuição por sexo inesperada: %q", stats.GenderDistribution)
	}
	if !strings.HasSuffix(stats.AverageAge, " anos") {
		t.Errorf("média de idade inesperada: %q", stats.AverageAge)
	}

	for _, ex := range stats.SampleExams {
		if !strings.HasPrefix(ex.PseudoId, "hash_") {
			t.Errorf("amostra sem pseudo-ID: %q", ex.PseudoId)
		}
	}
}

func TestAgeRanges(t *testing.T) {
	patients, events := mockdata.FetchCohortForStatistics("PRJ01")
	stats := Build(patients, nil, events)

	if len(stats.AgeRanges) != 4 {
		t.Fatalf("esperado 4 faixas etárias, veio %d", len(stats.AgeRanges))
	}
	var soma float32
	for _, r := range stats.AgeRanges {
		if r.Range == "" {
			t.Error("faixa etária sem rótulo")
		}
		soma += r.Percentage
	}
	if soma < 99.9 || soma > 100.1 {
		t.Errorf("percentuais das faixas somam %.1f%%, esperado 100%%", soma)
	}
}

func TestMedicationFrequency(t *testing.T) {
	patients, events := mockdata.FetchCohortForStatistics("PRJ01")
	stats := Build(patients, nil, events)

	if len(stats.Medications) == 0 {
		t.Fatal("coorte deveria ter medicamentos")
	}
	for _, m := range stats.Medications {
		if m.MedicationName == "" || m.Count <= 0 {
			t.Errorf("medicamento inválido: %+v", m)
		}
	}
}

func TestPseudoIDsRastreaveis(t *testing.T) {
	patients, events := mockdata.FetchCohortForStatistics("PRJ01")
	stats := Build(patients, nil, events)

	esperados := map[string]bool{}
	for _, p := range patients {
		esperados[transform.PseudoID(p.GetIdPaciente())] = true
	}
	for _, ex := range stats.SampleExams {
		if !esperados[ex.PseudoId] {
			t.Errorf("pseudo-ID %q não corresponde a nenhum paciente da coorte", ex.PseudoId)
		}
	}
}

func TestProjetoInexistente(t *testing.T) {
	patients, events := mockdata.FetchCohortForStatistics("PRJ_INEXISTENTE")
	stats := Build(patients, nil, events)

	if stats.TotalPatients != 0 || len(stats.SampleExams) != 0 {
		t.Errorf("projeto inexistente deveria zerar estatísticas: %+v", stats)
	}
	if len(stats.AgeRanges) != 0 || len(stats.Departments) != 0 {
		t.Errorf("coorte vazia não deveria gerar faixas/departamentos: %+v", stats)
	}
}
