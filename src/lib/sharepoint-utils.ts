// src/lib/sharepoint-utils.ts
import type { SoxControl } from "@/types";

/**
 * Parses values from SharePoint text columns that are intended to be booleans.
 * SharePoint "Yes/No" columns return true/false, but if a user creates a
 * text column, they might enter "Sim", "True", "x", etc.
 * @param value The value from SharePoint.
 * @returns `true` if the value represents a positive/true state, otherwise `false`.
 */
export const parseSharePointBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    return ['true', 'sim', 'yes', '1', 'x', 's'].includes(lowerValue);
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return false;
};

// This is the "source of truth" mapping our internal SoxControl property names
// to the EXACT SharePoint DISPLAY names. This can be shared between server and client components.
export const appToSpDisplayNameMapping: { [key in keyof Partial<SoxControl>]: string } = {
    codigoAnterior: "Cód Controle ANTERIOR",
    matriz: "Matriz",
    processo: "Processo",
    subProcesso: "Sub-Processo",
    riscoId: "Risco",
    riscoDescricao: "Descrição do Risco",
    riscoClassificacao: "Classificação do Risco",
    controlId: "Código NOVO",
    codigoCosan: "Código COSAN",
    objetivoControle: "Objetivo do Controle",
    controlName: "Nome do Controle",
    descriptionAnterior: "Descrição do controle ANTERIOR",
    description: "Descrição do controle ATUAL",
    tipo: "Tipo",
    controlFrequency: "Frequência",
    modalidade: "Modalidade",
    controlType: "P/D",
    mrc: "MRC?",
    evidenciaControle: "Evidência do controle",
    implementacaoData: "Implementação Data",
    dataUltimaAlteracao: "Data última alteração",
    sistemasRelacionados: "Sistemas Relacionados",
    transacoesTelasMenusCriticos: "Transações/Telas/Menus críticos",
    aplicavelIPE: "Aplicável IPE?",
    ipe_C: "C",
    ipe_EO: "E/O",
    ipe_VA: "V/A",
    ipe_OR: "O/R",
    ipe_PD: "P/D (IPE)",
    responsavel: "Responsável",
    controlOwner: "Dono do Controle (Control owner)",
    executorControle: "Executor do Controle",
    executadoPor: "Executado por",
    n3Responsavel: "N3 Responsável",
    area: "Área",
    vpResponsavel: "VP Responsável",
    impactoMalhaSul: "Impacto Malha Sul",
    sistemaArmazenamento: "Sistema Armazenamento",
};
