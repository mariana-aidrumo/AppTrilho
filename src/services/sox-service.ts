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

// Helper to map SharePoint list item (as text) to our typed SoxControl
const mapSharePointItemToSoxControl = (item: any): SoxControl => {
  const fields = item.fields;

  // Since all fields can be text, we need to parse them back to their correct types.
  let ipeAssertions: IPEAssertions = { C: false, EO: false, VA: false, OR: false, PD: false };
  if (fields.ipeAssertions && typeof fields.ipeAssertions === 'string') {
      try {
          const parsed = JSON.parse(fields.ipeAssertions);
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
          console.error(`Failed to parse ipeAssertions for item ${fields.id}:`, fields.ipeAssertions);
      }
  }

  return {
    id: item.id, // Use SharePoint's internal item ID
    controlId: fields.controlId || '',
    controlName: fields.controlName || '',
    codigoAnterior: fields.Title || '', // "Cód Controle ANTERIOR" is the Title field
    description: fields.description || '',
    controlOwner: fields.controlOwner || '', 
    controlFrequency: (fields.controlFrequency as ControlFrequency) || 'Ad-hoc',
    controlType: (fields.controlType as ControlType) || 'Preventivo',
    status: (fields.status as SoxControlStatus) || 'Inativo',
    lastUpdated: item.lastModifiedDateTime,
    processo: fields.processo || '',
    subProcesso: fields.subProcesso || '',
    modalidade: (fields.modalidade as ControlModalidade) || 'Híbrido',
    responsavel: fields.responsavel || '',
    n3Responsavel: fields.n3Responsavel || '',
    matriz: fields.matriz || '',
    riscoId: fields.riscoId || '',
    riscoDescricao: fields.riscoDescricao || '',
    riscoClassificacao: fields.riscoClassificacao || '',
    codigoCosan: fields.codigoCosan || '',
    objetivoControle: fields.objetivoControle || '',
    tipo: fields.tipo || '',
    mrc: parseSharePointBoolean(fields.mrc),
    evidenciaControle: fields.evidenciaControle || '',
    implementacaoData: fields.implementacaoData || '',
    dataUltimaAlteracao: fields.dataUltimaAlteracao || '',
    sistemasRelacionados: fields.sistemasRelacionados ? String(fields.sistemasRelacionados).split(';').map((s:string) => s.trim()) : [],
    transacoesTelasMenusCriticos: fields.transacoesTelasMenusCriticos || '',
    aplicavelIPE: parseSharePointBoolean(fields.aplicavelIPE),
    ipeAssertions: ipeAssertions,
    executorControle: fields.executorControle ? String(fields.executorControle).split(';').map((s:string) => s.trim()) : [],
    executadoPor: fields.executadoPor || '',
    area: fields.area || '',
    vpResponsavel: fields.vpResponsavel || '',
    impactoMalhaSul: parseSharePointBoolean(fields.impactoMalhaSul),
    sistemaArmazenamento: fields.sistemaArmazenamento || '',
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

  // Handle the special "Title" field mapping.
  // SharePoint requires the Title field, so we provide a placeholder if it's empty.
  fieldsToCreate.Title = controlData.codigoAnterior || '-';

  // Map all other fields from the controlData object to what SharePoint expects.
  // This approach is safer as it explicitly handles each type and avoids sending null/undefined.
  const fieldsToMap = {
    controlId: controlData.controlId,
    controlName: controlData.controlName,
    description: controlData.description,
    controlFrequency: controlData.controlFrequency,
    controlType: controlData.controlType,
    status: controlData.status || 'Ativo',
    processo: controlData.processo,
    subProcesso: controlData.subProcesso,
    modalidade: controlData.modalidade,
    matriz: controlData.matriz,
    riscoId: controlData.riscoId,
    riscoDescricao: controlData.riscoDescricao,
    riscoClassificacao: controlData.riscoClassificacao,
    codigoCosan: controlData.codigoCosan,
    objetivoControle: controlData.objetivoControle,
    tipo: controlData.tipo,
    evidenciaControle: controlData.evidenciaControle,
    implementacaoData: controlData.implementacaoData,
    dataUltimaAlteracao: controlData.dataUltimaAlteracao,
    transacoesTelasMenusCriticos: controlData.transacoesTelasMenusCriticos,
    executadoPor: controlData.executadoPor,
    area: controlData.area,
    vpResponsavel: controlData.vpResponsavel,
    sistemaArmazenamento: controlData.sistemaArmazenamento,
    controlOwner: controlData.controlOwner,
    responsavel: controlData.responsavel,
    n3Responsavel: controlData.n3Responsavel,
    mrc: controlData.mrc,
    aplicavelIPE: controlData.aplicavelIPE,
    impactoMalhaSul: controlData.impactoMalhaSul,
    sistemasRelacionados: controlData.sistemasRelacionados,
    executorControle: controlData.executorControle,
    ipeAssertions: controlData.ipeAssertions,
  };

  for (const [key, value] of Object.entries(fieldsToMap)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
          fieldsToCreate[key] = value.join('; ');
      } else if (typeof value === 'object') {
          fieldsToCreate[key] = JSON.stringify(value);
      } else {
          fieldsToCreate[key] = String(value);
      }
    }
  }

  const newItem = {
      fields: fieldsToCreate
  };

  try {
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
                        // The actual error from SharePoint is often nested
                        errorMessage = errorDetails?.error?.message || JSON.stringify(errorDetails);
                    } catch (parseError) {
                        // If the body isn't JSON, it might be plain text
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
