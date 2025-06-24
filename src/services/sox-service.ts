// src/services/sox-service.ts
'use server';

import { getGraphClient, getSiteId, getListId } from './sharepoint-client';
import type { SoxControl, ChangeRequest, MockUser, Notification, VersionHistoryEntry, UserProfileType, IPEAssertions, ControlFrequency, ControlType, SoxControlStatus, ControlModalidade } from '@/types';
import {
  mockChangeRequests,
  mockUsers,
  mockNotifications,
  mockVersionHistory,
} from '@/data/mock-data';
import { parseSharePointBoolean } from '@/lib/sharepoint-utils';

// --- SharePoint Integration ---

const { SHAREPOINT_SITE_URL } = process.env;
const SHAREPOINT_CONTROLS_LIST_NAME = 'modelo_controles1';

// This mapping translates our internal SoxControl property names to the expected SharePoint internal column names.
// This is crucial because SharePoint may have different internal names than our property names.
// Assumption: SharePoint column names are based on Excel headers with spaces/special chars removed.
const spFieldMapping: { [key in keyof Partial<SoxControl>]: string } = {
    codigoAnterior: 'Title',
    controlId: 'CodigoNOVO',
    controlName: 'NomedoControle',
    description: 'DescricaodocontroleATUAL',
    controlOwner: 'DonodoControle_x0028_Control_x00',
    controlFrequency: 'Frequ_x00eancia_',
    controlType: 'P_x002f_D',
    processo: 'Processo',
    subProcesso: 'Sub_x002d_Processo',
    modalidade: 'Modalidade',
    responsavel: 'Respons_x00e1_vel',
    n3Responsavel: 'N3Respons_x00e1_vel',
    matriz: 'Matriz',
    riscoId: 'Risco',
    riscoDescricao: 'Descri_x00e7__x00e3_odoRisco',
    riscoClassificacao: 'Classifica_x00e7__x00e3_odoRisco',
    codigoCosan: 'C_x00f3_digoCOSAN',
    objetivoControle: 'ObjetivodoControle',
    tipo: 'Tipo',
    mrc: 'MRC_x003f_',
    evidenciaControle: 'Evid_x00ea_nciadocontrole',
    implementacaoData: 'Implementa_x00e7__x00e3_o',
    dataUltimaAlteracao: 'Data_x00fa_ltimaaltera_x00e7__x0',
    sistemasRelacionados: 'SistemasRelacionados',
    transacoesTelasMenusCriticos: 'Transa_x00e7__x00f5_es_x002f_Telas',
    aplicavelIPE: 'Aplic_x00e1_velIPE_x003f_',
    ipeAssertions: 'ipeAssertions', // Assuming a simple name for the JSON string
    executorControle: 'ExecutordoControle',
    executadoPor: 'Executadopor',
    area: '_x00c1_rea',
    vpResponsavel: 'VPRespons_x00e1_vel',
    impactoMalhaSul: 'ImpactoMalhaSul',
    sistemaArmazenamento: 'SistemaArmazenamento',
};

// Helper to map SharePoint list item to our typed SoxControl
const mapSharePointItemToSoxControl = (item: any): SoxControl => {
  const fields = item.fields;

  // Since all fields can be text, we need to parse them back to their correct types.
  let ipeAssertions: IPEAssertions = { C: false, EO: false, VA: false, OR: false, PD: false };
  // Using the mapped field name to read the data
  const ipeString = fields[spFieldMapping.ipeAssertions!] || fields['ipe_C'] || fields['ipe_EO']; // Fallback for older data structures
  if (ipeString && typeof ipeString === 'string') {
      try {
          const parsed = JSON.parse(ipeString);
          if(typeof parsed === 'object' && parsed !== null) {
            ipeAssertions = { 
                C: parseSharePointBoolean(parsed.C),
                EO: parseSharePointBoolean(parsed.EO),
                VA: parseSharePointBoolean(parsed.VA),
                OR: parseSharePointBoolean(parsed.OR),
                PD: parseSharePointBoolean(parsed.PD),
            };
          }
      } catch (e) {
          console.error(`Failed to parse ipeAssertions for item ${fields.id}:`, ipeString);
      }
  }

  return {
    id: item.id, // Use SharePoint's internal item ID
    controlId: fields[spFieldMapping.controlId!] || '',
    controlName: fields[spFieldMapping.controlName!] || '',
    codigoAnterior: fields[spFieldMapping.codigoAnterior!] || '', // "Cód Controle ANTERIOR" is the Title field
    description: fields[spFieldMapping.description!] || '',
    controlOwner: fields[spFieldMapping.controlOwner!] || '', 
    controlFrequency: (fields[spFieldMapping.controlFrequency!] as ControlFrequency) || 'Ad-hoc',
    controlType: (fields[spFieldMapping.controlType!] as ControlType) || 'Preventivo',
    status: (fields.status as SoxControlStatus) || 'Inativo', // Status field might not be in the mapping if it's system-managed
    lastUpdated: item.lastModifiedDateTime,
    processo: fields[spFieldMapping.processo!] || '',
    subProcesso: fields[spFieldMapping.subProcesso!] || '',
    modalidade: (fields[spFieldMapping.modalidade!] as ControlModalidade) || 'Híbrido',
    responsavel: fields[spFieldMapping.responsavel!] || '',
    n3Responsavel: fields[spFieldMapping.n3Responsavel!] || '',
    matriz: fields[spFieldMapping.matriz!] || '',
    riscoId: fields[spFieldMapping.riscoId!] || '',
    riscoDescricao: fields[spFieldMapping.riscoDescricao!] || '',
    riscoClassificacao: fields[spFieldMapping.riscoClassificacao!] || '',
    codigoCosan: fields[spFieldMapping.codigoCosan!] || '',
    objetivoControle: fields[spFieldMapping.objetivoControle!] || '',
    tipo: fields[spFieldMapping.tipo!] || '',
    mrc: parseSharePointBoolean(fields[spFieldMapping.mrc!]),
    evidenciaControle: fields[spFieldMapping.evidenciaControle!] || '',
    implementacaoData: fields[spFieldMapping.implementacaoData!] || '',
    dataUltimaAlteracao: fields[spFieldMapping.dataUltimaAlteracao!] || '',
    sistemasRelacionados: fields[spFieldMapping.sistemasRelacionados!] ? String(fields[spFieldMapping.sistemasRelacionados!]).split(';').map((s:string) => s.trim()) : [],
    transacoesTelasMenusCriticos: fields[spFieldMapping.transacoesTelasMenusCriticos!] || '',
    aplicavelIPE: parseSharePointBoolean(fields[spFieldMapping.aplicavelIPE!]),
    ipeAssertions: ipeAssertions,
    executorControle: fields[spFieldMapping.executorControle!] ? String(fields[spFieldMapping.executorControle!]).split(';').map((s:string) => s.trim()) : [],
    executadoPor: fields[spFieldMapping.executadoPor!] || '',
    area: fields[spFieldMapping.area!] || '',
    vpResponsavel: fields[spFieldMapping.vpResponsavel!] || '',
    impactoMalhaSul: parseSharePointBoolean(fields[spFieldMapping.impactoMalhaSul!]),
    sistemaArmazenamento: fields[spFieldMapping.sistemaArmazenamento!] || '',
  };
};

export const getSoxControls = async (): Promise<SoxControl[]> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint site URL or list name is not configured.");
    }
    
    try {
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
        
        const response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items?expand=fields(select=*)`)
            .get();

        if (response && response.value) {
            // The SharePoint API might return encoded names, let's log the first item's fields to debug if needed
            if(response.value.length > 0) {
                console.log("SharePoint fields received:", response.value[0].fields);
            }
            return response.value.map(mapSharePointItemToSoxControl);
        }
        return [];
    } catch (error) {
        console.error("Failed to get SOX controls from SharePoint:", error);
        return [];
    }
};

export const addSoxControl = async (controlData: Partial<SoxControl>): Promise<SoxControl> => {
  if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
    throw new Error("SharePoint site URL or list name is not configured.");
  }

  const graphClient = await getGraphClient();
  const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
  const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);

  const fieldsToCreate: { [key: string]: any } = {};

  // Iterate over our mapping to build the request payload for SharePoint
  for (const key in spFieldMapping) {
      const soxKey = key as keyof SoxControl;
      const spKey = spFieldMapping[soxKey];

      if (spKey && controlData[soxKey] !== undefined && controlData[soxKey] !== null) {
          const value = controlData[soxKey];
          if (Array.isArray(value)) {
              fieldsToCreate[spKey] = value.join('; ');
          } else if (typeof value === 'object') {
              fieldsToCreate[spKey] = JSON.stringify(value);
          } else {
              fieldsToCreate[spKey] = String(value);
          }
      }
  }

  // Ensure Title is set, as it's often mandatory in SharePoint
  if (!fieldsToCreate.Title) {
      fieldsToCreate.Title = controlData.codigoAnterior || '-';
  }

  const newItem = {
      fields: fieldsToCreate
  };

  try {
      console.log("Attempting to create item in SharePoint with payload:", newItem);
      const response = await graphClient
          .api(`/sites/${siteId}/lists/${listId}/items`)
          .post(newItem);
      return mapSharePointItemToSoxControl(response);
  } catch (error) {
      console.error("Error details sending to SharePoint:", {
        itemSent: newItem,
        errorBody: error.body,
      });
      throw error;
  }
};


export const addSoxControlsInBulk = async (controls: Partial<SoxControl>[]): Promise<{ controlsAdded: number; errors: { controlId?: string; message: string }[] }> => {
    let controlsAdded = 0;
    const errors: { controlId?: string; message: string }[] = [];
    
    for (const control of controls) {
        try {
            if (control.controlName && control.description) {
                await addSoxControl(control);
                controlsAdded++;
            } else {
                errors.push({ controlId: control.controlId || 'ID Desconhecido', message: 'Campos obrigatórios (Nome, Descrição) não preenchidos.' });
            }
        } catch (error: any) {
            console.error(`Falha ao adicionar controle ${control.controlId || 'sem ID'}. Detalhes:`, error);
    
            let errorMessage = 'Um erro desconhecido ocorreu.';
            if (error) {
                if (error.body) {
                    try {
                        const errorDetails = JSON.parse(error.body);
                        errorMessage = errorDetails?.error?.message || JSON.stringify(errorDetails);
                    } catch (parseError) {
                        errorMessage = String(error.body);
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                } else {
                    errorMessage = JSON.stringify(error);
                }
            }
            
            errors.push({ controlId: control.controlId, message: errorMessage });
        }
    }
    return { controlsAdded, errors };
};

export const getFilterOptions = async () => {
    const controls = await getSoxControls();
    
    const processos = ["Todos", ...Array.from(new Set(controls.map(c => c.processo).filter(Boolean))) as string[]];
    const subProcessos = ["Todos", ...Array.from(new Set(controls.map(c => c.subProcesso).filter(Boolean))) as string[]];
    const donos = ["Todos", ...Array.from(new Set(controls.map(c => c.controlOwner).filter(Boolean))) as string[]];
    const responsaveis = ["Todos", ...Array.from(new Set(controls.map(c => c.responsavel).filter(Boolean))) as string[]];
    const n3Responsaveis = ["Todos", ...Array.from(new Set(controls.map(c => c.n3Responsavel).filter(Boolean))) as string[]];

    return {
        processos,
        subProcessos,
        donos,
        responsaveis,
        n3Responsaveis,
    };
};


// --- Mocked Data Services (To be migrated to SharePoint) ---

export const getChangeRequests = async (): Promise<ChangeRequest[]> => JSON.parse(JSON.stringify(mockChangeRequests));
export const getUsers = async (): Promise<MockUser[]> => JSON.parse(JSON.stringify(mockUsers));
export const getNotifications = async (userId: string): Promise<Notification[]> => JSON.parse(JSON.stringify(mockNotifications.filter(n => n.userId === userId)));
export const getVersionHistory = async (): Promise<VersionHistoryEntry[]> => JSON.parse(JSON.stringify(mockVersionHistory));

export const addChangeRequest = async (requestData: Partial<ChangeRequest>): Promise<ChangeRequest> => {
    console.warn("addChangeRequest is using mock data.");
    const newRequest: ChangeRequest = {
        ...requestData,
        id: `cr-new-${Date.now()}`,
        requestDate: new Date().toISOString(),
    } as ChangeRequest;
    mockChangeRequests.unshift(newRequest);
    return JSON.parse(JSON.stringify(newRequest));
};

export const addUser = async (userData: {name: string, email: string}): Promise<MockUser> => {
    console.warn("addUser is using mock data.");
    const newUser: MockUser = {
        id: `user-new-${Date.now()}`,
        name: userData.name,
        email: userData.email,
        password: 'DefaultPassword123',
        roles: ['control-owner'],
        activeProfile: 'Dono do Controle',
    };
    mockUsers.push(newUser);
    return JSON.parse(JSON.stringify(newUser));
}

export const updateUserRolesAndProfile = async (userId: string, roles: string[], activeProfile: UserProfileType): Promise<MockUser | null> => {
    console.warn("updateUserRolesAndProfile is using mock data.");
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if(userIndex > -1) {
        mockUsers[userIndex].roles = roles;
        mockUsers[userIndex].activeProfile = activeProfile;
        return JSON.parse(JSON.stringify(mockUsers[userIndex]));
    }
    return null;
}

export const deleteUser = async (userId: string): Promise<boolean> => {
    console.warn("deleteUser is using mock data.");
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex > -1) {
        mockUsers.splice(userIndex, 1);
        return true;
    }
    return false;
}
