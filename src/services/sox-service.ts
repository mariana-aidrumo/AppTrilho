
// src/services/sox-service.ts
'use server';

import { getGraphClient, getSiteId, getListId } from './sharepoint-client';
import type { SoxControl, ChangeRequest, MockUser, Notification, VersionHistoryEntry, UserProfileType, ControlFrequency, ControlType, SoxControlStatus, ControlModalidade } from '@/types';
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

// This mapping translates our internal SoxControl property names to the SharePoint DISPLAY NAMES.
// This is more reliable when internal names with special character encodings are unknown.
const spFieldMapping: { [key in keyof Partial<SoxControl>]: string } = {
    codigoAnterior: 'Title',
    matriz: 'Matriz',
    processo: 'Processo',
    subProcesso: 'Sub-Processo',
    riscoId: 'Risco',
    riscoDescricao: 'Descrição do Risco',
    riscoClassificacao: 'Classificação do Risco',
    controlId: 'Codigo NOVO',
    codigoCosan: 'Codigo COSAN',
    objetivoControle: 'Objetivo do Controle',
    controlName: 'Nome do Controle',
    description: 'Descrição do controle ATUAL',
    tipo: 'Tipo',
    controlFrequency: 'Frequência',
    modalidade: 'Modalidade',
    controlType: 'P/D',
    mrc: 'MRC?',
    evidenciaControle: 'Evidência do controle',
    implementacaoData: 'Implementação Data',
    dataUltimaAlteracao: 'Data última alteração',
    sistemasRelacionados: 'Sistemas Relacionados',
    transacoesTelasMenusCriticos: 'Transações/Telas/Menus críticos',
    aplicavelIPE: 'Aplicável IPE?',
    ipe_C: 'C',
    ipe_EO: 'E/O',
    ipe_VA: 'V/A',
    ipe_OR: 'O/R',
    ipe_PD: 'P/D (IPE)',
    responsavel: 'Responsável',
    controlOwner: 'Dono do Controle (Control owner)',
    executorControle: 'Executor do Controle',
    executadoPor: 'Executado por',
    n3Responsavel: 'N3 Responsável',
    area: 'Área',
    vpResponsavel: 'VP Responsável',
    impactoMalhaSul: 'Impacto Malha Sul',
    sistemaArmazenamento: 'Sistema Armazenamento',
};


// Helper to map SharePoint list item to our typed SoxControl
const mapSharePointItemToSoxControl = (item: any): SoxControl => {
  const fields = item.fields;
  
  // Create a reverse mapping to read data from SharePoint
  const readMapping: { [spKey: string]: keyof SoxControl } = {};
  for (const key in spFieldMapping) {
      const soxKey = key as keyof SoxControl;
      readMapping[spFieldMapping[soxKey]] = soxKey;
  }
  
  const soxControl: Partial<SoxControl> = {
    id: item.id,
    status: (fields.status as SoxControlStatus) || 'Ativo',
    lastUpdated: item.lastModifiedDateTime,
  };

  for(const spKey in fields) {
    const soxKey = readMapping[spKey];
    if (soxKey) {
        let value = fields[spKey];
        const booleanFields: (keyof SoxControl)[] = ['mrc', 'aplicavelIPE', 'ipe_C', 'ipe_EO', 'ipe_VA', 'ipe_OR', 'ipe_PD', 'impactoMalhaSul'];
        
        if (soxKey === 'sistemasRelacionados' || soxKey === 'executorControle') {
            value = typeof value === 'string' ? value.split(';').map(s => s.trim()) : [];
        } else if (booleanFields.includes(soxKey)) {
            value = parseSharePointBoolean(value);
        }
        (soxControl as any)[soxKey] = value;
    }
  }

  // Handle the title field separately since its display name might be different from 'Title'
  if (fields.Title) {
      soxControl.codigoAnterior = fields.Title;
  }


  return soxControl as SoxControl;
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
  
    // Process each field from the provided control data
    for (const key in controlData) {
        const soxKey = key as keyof SoxControl;
        const spKey = spFieldMapping[soxKey];
        const value = controlData[soxKey];

        // Ensure we have a corresponding SharePoint key to prevent sending unknown fields
        if (spKey) {
            // Handle null or undefined values by sending an empty string
            if (value === null || value === undefined) {
                fieldsToCreate[spKey] = "";
            } 
            // Convert arrays to a semicolon-separated string
            else if (Array.isArray(value)) {
                fieldsToCreate[spKey] = value.join('; ');
            } 
            // Convert booleans to "Sim" or "Não" for text fields
            else if (typeof value === 'boolean') {
                fieldsToCreate[spKey] = value ? 'Sim' : 'Não';
            }
             // Convert dates to a standard string format if they are Date objects
            else if (value instanceof Date) {
                 fieldsToCreate[spKey] = value.toLocaleDateString('pt-BR');
            }
            // For all other types, convert to a plain string
            else {
                fieldsToCreate[spKey] = String(value);
            }
        }
    }
    
    // Ensure the required Title field has a value, even if it's just a placeholder
    if (!fieldsToCreate['Title']) {
        fieldsToCreate['Title'] = controlData.codigoAnterior || '-';
    }

    const newItem = {
        fields: fieldsToCreate
    };
  
    try {
        const response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items`)
            .post(newItem);
        return mapSharePointItemToSoxControl(response);
    } catch (error: any) {
        let errorMessage = 'An unknown error occurred while adding the control.';
        if (error.body) {
            try {
                const errorDetails = JSON.parse(error.body);
                errorMessage = errorDetails?.error?.message || JSON.stringify(errorDetails.error);
            } catch (e) {
                errorMessage = String(error.body);
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        console.error("Error details sending to SharePoint:", {
          itemSent: newItem,
          errorMessage: errorMessage,
        });
        // Re-throw with a more specific message for the UI
        throw new Error(errorMessage);
    }
};


export const addSoxControlsInBulk = async (controls: Partial<SoxControl>[]): Promise<{ controlsAdded: number; errors: { controlId?: string; message: string }[] }> => {
    let controlsAdded = 0;
    const errors: { controlId?: string; message: string }[] = [];
    
    for (const control of controls) {
        try {
            // A control is valid if it has at least a name or an ID from the sheet
            if (control.controlName || control.controlId) {
                await addSoxControl(control);
                controlsAdded++;
            } else {
                errors.push({ controlId: 'Linha vazia', message: 'A linha parece estar vazia ou não possui um ID ou Nome de controle.' });
            }
        } catch (error: any) {
            errors.push({ 
                controlId: control.controlId || control.controlName || 'ID Desconhecido', 
                message: error.message || 'Um erro desconhecido ocorreu.' 
            });
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
