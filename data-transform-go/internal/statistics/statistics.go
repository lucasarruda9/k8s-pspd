// Package statistics produz as estatísticas agregadas da coorte (nível
// AGGREGATED, perfil Pesquisador). Port do statistics.js.
package statistics

import (
	"fmt"
	"strings"
	"time"

	"github.com/lucasarruda9/k8s-pspd/data-transform-go/internal/transform"
	pb "github.com/lucasarruda9/k8s-pspd/data-transform-go/proto"
)

// Consumido pelo RPC GetCohortStatistics. Nenhum dado identificável é exposto.
func Build(patients []*pb.DBPatient, events []*pb.DBClinicalEvent) *pb.StatisticsResponse {
	return &pb.StatisticsResponse{
		TotalPatients:      int32(len(patients)),
		GenderDistribution: genderDistribution(patients),
		AverageAge:         averageAge(patients),
		SampleExams:        buildAnonymizedExams(patients, events),
	}
}

func genderDistribution(patients []*pb.DBPatient) string {
	if len(patients) == 0 {
		return "0% F | 0% M"
	}
	var female, male int
	for _, p := range patients {
		switch strings.ToLower(p.GetGenero()) {
		case "female", "f":
			female++
		case "male", "m":
			male++
		}
	}
	total := len(patients)
	pct := func(n int) int { return int(float64(n)/float64(total)*100 + 0.5) }
	return fmt.Sprintf("%d%% F | %d%% M", pct(female), pct(male))
}

func averageAge(patients []*pb.DBPatient) string {
	now := time.Now()
	var sum, count int
	for _, p := range patients {
		if age, ok := transform.ComputeAge(p.GetDataNascimento(), now); ok {
			sum += age
			count++
		}
	}
	if count == 0 {
		return "0 anos"
	}
	return fmt.Sprintf("%.1f anos", float64(sum)/float64(count))
}

func buildAnonymizedExams(patients []*pb.DBPatient, events []*pb.DBClinicalEvent) []*pb.AnonymizedExam {
	type bucket struct{ hba1c, glicemia, imc string }
	byPatient := map[string]*bucket{}

	for _, ev := range events {
		if !strings.Contains(strings.ToLower(ev.GetTipoEvento()), "observ") {
			continue
		}
		b, ok := byPatient[ev.GetIdPaciente()]
		if !ok {
			b = &bucket{}
			byPatient[ev.GetIdPaciente()] = b
		}
		code := strings.ToLower(ev.GetCodigoTipoEvento())
		switch {
		case strings.Contains(code, "hba1c"):
			b.hba1c = ev.GetValor()
		case strings.Contains(code, "glicem"):
			b.glicemia = ev.GetValor()
		case strings.Contains(code, "imc"):
			b.imc = ev.GetValor()
		}
	}

	now := time.Now()
	var exams []*pb.AnonymizedExam
	for _, p := range patients {
		b, ok := byPatient[p.GetIdPaciente()]
		if !ok {
			continue // paciente sem exames relevantes é omitido da amostra
		}
		age, _ := transform.ComputeAge(p.GetDataNascimento(), now)
		exams = append(exams, &pb.AnonymizedExam{
			PseudoId: transform.PseudoID(p.GetIdPaciente()),
			Age:      int32(age),
			Gender:   p.GetGenero(),
			Hba1C:    b.hba1c,
			Glicemia: b.glicemia,
			Imc:      b.imc,
		})
	}
	return exams
}
func ageRanges(patients []*pb.DBPatient) []*pb.AgeRangeDistribution {
    ranges := []string{"0-18", "19-39", "40-59", "60+"}
    counts := make([]int, len(ranges))
    now := time.Now()
    
    for _, p := range patients {
        if age, ok := transform.ComputeAge(p.GetDataNascimento(), now); ok {
            switch {
            case age <= 18: counts[0]++
            case age <= 39: counts[1]++
            case age <= 59: counts[2]++
            default: counts[3]++
            }
        }
    }
    
    var res []*pb.AgeRangeDistribution
    total := float64(len(patients))
    for i, count := range ranges {
        res = append(res, &pb.AgeRangeDistribution{
            Range: count,
            Percentage: float64(counts[i]) / total * 100,
        })
    }
    return res
}

func departmentFrequency(encounters []*pb.DBEncounter) []*pb.DepartmentFrequency {
    freq := make(map[string]int)
    for _, e := range encounters {
        freq[e.GetSetorDepartamento()]++
    }
    
    var res []*pb.DepartmentFrequency
    total := float64(len(encounters))
    for name, count := range freq {
        res = append(res, &pb.DepartmentFrequency{
            DepartmentName: name,
            Percentage: float64(count) / total * 100,
        })
    }
    return res
}

func medicationFrequency(events []*pb.DBClinicalEvent) []*pb.MedicationFrequency {
    freq := make(map[string]int)
    for _, ev := range events {
        if transform.EventKind(ev.GetTipoEvento()) == "medication" { // Verifique se esta função existe no seu transform
            freq[ev.GetCodigoTipoEvento()]++
        }
    }
    
    var res []*pb.MedicationFrequency
    for name, count := range freq {
        res = append(res, &pb.MedicationFrequency{
            MedicationName: name,
            Count: int32(count),
        })
    }
    return res
}
