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
	stats := Build(patients, events)

	if stats.TotalPatients == 0 {
		t.Fatal("coorte de Diabetes deveria ter pacientes")
	}
	if !regexp.MustCompile(`% F \| .*% M`).MatchString(stats.GenderDistribution) {
		t.Errorf("distribuição por sexo inesperada: %q", stats.GenderDistribution)
	}
	if !strings.HasSuffix(stats.AverageAge, " anos") {
		t.Errorf("média de idade inesperada: %q", stats.AverageAge)
	}

	// amostra deve ser anonimizada: pseudo-ID, nunca ID real
	for _, ex := range stats.SampleExams {
		if !strings.HasPrefix(ex.PseudoId, "hash_") {
			t.Errorf("amostra sem pseudo-ID: %q", ex.PseudoId)
		}
	}
}

func TestPseudoIDsRastreaveis(t *testing.T) {
	patients, events := mockdata.FetchCohortForStatistics("PRJ01")
	stats := Build(patients, events)

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
	stats := Build(patients, events)
	if stats.TotalPatients != 0 || len(stats.SampleExams) != 0 {
		t.Errorf("projeto inexistente deveria zerar estatísticas: %+v", stats)
	}
}
