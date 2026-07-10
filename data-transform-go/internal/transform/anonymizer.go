// Package transform aplica o mascaramento por nível de acesso e converte
// registros clínicos em recursos HL7/FHIR.
package transform

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

const (
	AccessFull       = "FULL"
	AccessPartial    = "PARTIAL"
	AccessAnonymized = "ANONYMIZED"
	AccessAggregated = "AGGREGATED"
)

// PseudoID gera um identificador determinístico e irreversível a partir do ID real.
func PseudoID(realID string) string {
	sum := sha256.Sum256([]byte(realID))
	return "hash_" + hex.EncodeToString(sum[:])[:8]
}

func Initials(fullName string) string {
	fullName = strings.TrimSpace(fullName)
	if fullName == "" {
		return ""
	}
	var parts []string
	for _, p := range strings.Fields(fullName) {
		if len([]rune(p)) > 2 {
			r := []rune(p)
			parts = append(parts, strings.ToUpper(string(r[0]))+".")
		}
	}
	return strings.Join(parts, " ")
}

func ComputeAge(birthDate string, ref time.Time) (int, bool) {
	if birthDate == "" {
		return 0, false
	}
	b, err := time.Parse("2006-01-02", birthDate[:min(len(birthDate), 10)])
	if err != nil {
		return 0, false
	}
	age := ref.Year() - b.Year()
	// NÃO usar YearDay(), que diverge entre anos bissextos e não-bissextos para datas após fevereiro.
	if ref.Month() < b.Month() || (ref.Month() == b.Month() && ref.Day() < b.Day()) {
		age--
	}
	return age, true
}

func BirthYear(birthDate string) string {
	if len(birthDate) < 4 {
		return ""
	}
	return birthDate[:4]
}

func PatientReference(realID, accessLevel string) string {
	id := realID
	if accessLevel == AccessAnonymized {
		id = PseudoID(realID)
	}
	return fmt.Sprintf("Patient/%s", id)
}
