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

// This mapping translates our internal SoxControl property names to the SharePoint internal column names.
// It's built based on user-provided column names and SharePoint's typical encoding for special characters.
const spFieldMapping: { [key in keyof Partial<SoxControl>]: string } = {
    codigoAnterior: 'Title', // Confirmed as Title field
    matriz: 'Matriz',
    processo: 'Processo',
    subProcesso: 'Sub_x002d_Processo',
    riscoId: 'Risco',
    riscoDescricao: 'Descri_x00e7__x00e3_odoRisco',
    riscoClassificacao: 'Classifica_x00e7__x00e3_odoRisco',
    controlId: 'CodigoNOVO',
    codigoCosan: 'CodigoCOSAN',
    objetivoControle: 'ObjetivodoControle',
    controlName: 'NomedoControle',
    description: 'Descri_x00e7__x00e3_odocontroleA', // SharePoint likely truncates "Descrição do controle ATUAL"
    tipo: 'Tipo',
    controlFrequency: 'Frequ_x00ea_ncia',
    modalidade: 'Modalidade',
    controlType: 'P_x002f_D',
    mrc: 'MRC_x003f_',
    evidenciaControle: 'Evid_x00ea_nciadocontrole',
    implementacaoData: 'Implementa_x00e7__x00e3_o_x0020_Data',
    dataUltimaAlteracao: 'Data_x00fa_ltimaaltera_x00e7__x0', // Truncated
    sistemasRelacionados: 'SistemasRelacionados',
    transacoesTelasMenusCriticos: 'Transa_x00e7__x00f5_es_x002f_Telas_x002f_Menus_x0020_cr_x00ed_ticos',
    aplicavelIPE: 'Aplic_x00e1_velIPE_x003f_',
    ipe_C: 'C',
    ipe_EO: 'E_x002f_O',
    ipe_VA: 'V_x002f_A',
    ipe_OR: 'O_x002f_R',
    ipe_PD: 'P_x002f_D_x0028_IPE_x0029_',
    responsavel: 'Respons_x00e1_vel',
    controlOwner: 'DonodoControle_x0028_Control_x00', // Truncated
    executorControle: 'ExecutordoControle',
    executadoPor: 'Executado_x0020_por',
    n3Responsavel: 'N3Respons_x00e1_vel',
    area: '_x00c1_rea',
    vpResponsavel: 'VPRespons_x00e1_vel',
    impactoMalhaSul: 'ImpactoMalhaSul',
    sistemaArmazenamento: 'SistemaArmazenamento',
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
        fieldsToCreate['Title'] = '-';
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
