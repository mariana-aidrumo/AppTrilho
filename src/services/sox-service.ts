
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

// This mapping translates our internal SoxControl property names to SharePoint's internal field names.
// This is a more robust approach than using display names, which can have special characters.
const spFieldMapping: { [key in keyof Partial<SoxControl>]: string } = {
    codigoAnterior: 'Title', // Special case: Maps to the default Title field
    matriz: 'Matriz',
    processo: 'Processo',
    subProcesso: 'Sub_x002d_Processo',
    riscoId: 'Risco',
    riscoDescricao: 'Descri_x00e7__x00e3_o_x0020_do_x0020_Risco',
    riscoClassificacao: 'Classifica_x00e7__x00e3_o_x0020_do_x0020_Risco',
    controlId: 'Codigo_x0020_NOVO',
    codigoCosan: 'Codigo_x0020_COSAN',
    objetivoControle: 'Objetivo_x0020_do_x0020_Controle',
    controlName: 'Nome_x0020_do_x0020_Controle',
    description: 'Descri_x00e7__x00e3_o_x0020_do_x0020_controle_x0020_ATUAL',
    tipo: 'Tipo',
    controlFrequency: 'Frequ_x00ea_ncia',
    modalidade: 'Modalidade',
    controlType: 'P_x002f_D',
    mrc: 'MRC_x003f_',
    evidenciaControle: 'Evid_x00ea_ncia_x0020_do_x0020_controle',
    implementacaoData: 'Implementa_x00e7__x00e3_o_x0020_Data',
    dataUltimaAlteracao: 'Data_x0020__x00fa_ltima_x0020_altera_x00e7__x00e3_o',
    sistemasRelacionados: 'Sistemas_x0020_Relacionados',
    transacoesTelasMenusCriticos: 'Transa_x00e7__x00f5_es_x002f_Telas_x002f_Menus_x0020_cr_x00ed_ticos',
    aplicavelIPE: 'Aplic_x00e1_vel_x0020_IPE_x003f_',
    ipe_C: 'C',
    ipe_EO: 'E_x002f_O',
    ipe_VA: 'V_x002f_A',
    ipe_OR: 'O_x002f_R',
    ipe_PD: 'P_x002f_D_x0020__x0028_IPE_x0029_',
    responsavel: 'Respons_x00e1_vel',
    controlOwner: 'Dono_x0020_do_x0020_Controle_x0020__x0028_Control_x0020_owner_x0029_',
    executorControle: 'Executor_x0020_do_x0020_Controle',
    executadoPor: 'Executado_x0020_por',
    n3Responsavel: 'N3_x0020_Respons_x00e1_vel',
    area: '_x00c1_rea',
    vpResponsavel: 'VP_x0020_Respons_x00e1_vel',
    impactoMalhaSul: 'Impacto_x0020_Malha_x0020_Sul',
    sistemaArmazenamento: 'Sistema_x0020_Armazenamento',
};


// Helper to map SharePoint list item to our typed SoxControl
const mapSharePointItemToSoxControl = (item: any): SoxControl => {
  const fields = item.fields;
  
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
  
    for (const key in controlData) {
        const soxKey = key as keyof SoxControl;
        const spKey = spFieldMapping[soxKey];
        const value = controlData[soxKey];

        if (spKey) {
            if (value === null || value === undefined) {
                fieldsToCreate[spKey] = "";
            } 
            else if (Array.isArray(value)) {
                fieldsToCreate[spKey] = value.join('; ');
            } 
            else if (typeof value === 'boolean') {
                fieldsToCreate[spKey] = value ? 'Sim' : 'Não';
            }
            else if (value instanceof Date) {
                 fieldsToCreate[spKey] = value.toLocaleDateString('pt-BR');
            }
            else {
                fieldsToCreate[spKey] = String(value);
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
    } catch (error: any) {
        let errorMessage;
        
        if (error.body) {
            try {
                const errorDetails = JSON.parse(error.body);
                const nestedError = errorDetails.error;
                if (nestedError?.message) {
                    errorMessage = nestedError.message;
                }
            } catch (e) {
                // Ignore parsing errors, fallback to other methods
            }
        }
        
        if (!errorMessage && error.message) {
            errorMessage = error.message;
        }

        if (!errorMessage) {
            errorMessage = 'An unknown error occurred. Check server logs for the full error object.';
            console.error("Full SharePoint Error Object:", JSON.stringify(error, null, 2));
        }

        console.error("Error details sending to SharePoint:", {
          itemSent: newItem,
          parsedErrorMessage: errorMessage,
        });
        
        throw new Error(errorMessage);
    }
};


export const addSoxControlsInBulk = async (controls: Partial<SoxControl>[]): Promise<{ controlsAdded: number; errors: { controlId?: string; message: string }[] }> => {
    let controlsAdded = 0;
    const errors: { controlId?: string; message: string }[] = [];
    
    for (const control of controls) {
        try {
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
