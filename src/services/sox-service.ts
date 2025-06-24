
// src/services/sox-service.ts
'use server';

import { getGraphClient, getSiteId, getListId } from './sharepoint-client';
import type { SoxControl, ChangeRequest, MockUser, Notification, VersionHistoryEntry, UserProfileType, SoxControlStatus } from '@/types';
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

// This is the new "source of truth" mapping our internal SoxControl property names
// to the EXACT SharePoint DISPLAY names. This will be used to build the dynamic map.
export const appToSpDisplayNameMapping: { [key in keyof Partial<SoxControl>]: string } = {
    codigoAnterior: "Cód Controle ANTERIOR",
    matriz: "Matriz",
    processo: "Processo",
    subProcesso: "Sub-Processo",
    riscoId: "Risco",
    riscoDescricao: "Descrição do Risco",
    riscoClassificacao: "Classificação do Risco",
    controlId: "Codigo NOVO",
    codigoCosan: "Codigo COSAN",
    objetivoControle: "Objetivo do Controle",
    controlName: "Nome do Controle",
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

// Cache for the dynamically generated mapping.
let dynamicSpFieldMapping: { [key: string]: string } | null = null;
let reverseDynamicSpFieldMapping: { [key: string]: string } | null = null;

/**
 * Fetches column definitions from SharePoint and builds a dynamic mapping.
 * This is the core of the new creative solution.
 */
const buildAndCacheDynamicMapping = async (): Promise<void> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint configuration is missing.");
    }
    try {
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);

        const response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/columns`)
            .get();

        if (!response || !response.value) {
            throw new Error("Could not fetch column definitions from SharePoint.");
        }

        const spColumns = response.value;
        const newMapping: { [key: string]: string } = {};
        const newReverseMapping: { [key: string]: string } = {};
        const spDisplayNameToInternalNameMap: { [key: string]: string } = {};

        for (const column of spColumns) {
            spDisplayNameToInternalNameMap[column.displayName] = column.name;
            newReverseMapping[column.name] = column.displayName; // For reading data back
        }

        // Build the final mapping from our app's keys to SharePoint's internal names
        for (const appKey in appToSpDisplayNameMapping) {
            const displayName = (appToSpDisplayNameMapping as any)[appKey];
            const internalName = spDisplayNameToInternalNameMap[displayName];
            
            if (internalName) {
                (newMapping as any)[appKey] = internalName;
            } else if (displayName === "Cód Controle ANTERIOR") {
                // Special case for the Title field, whose display name might be customized.
                const titleColumn = spColumns.find((c: any) => c.name === 'Title');
                if (titleColumn) {
                    (newMapping as any)[appKey] = 'Title';
                } else {
                     console.warn(`Could not find a mapping for display name: '${displayName}' (Title field).`);
                }
            }
            else {
                 console.warn(`Could not find a mapping for display name: '${displayName}'. Skipping this field.`);
            }
        }
        
        dynamicSpFieldMapping = newMapping;
        // Build the reverse map for reading data
        const reverseMapForReading: { [key: string]: string } = {};
        for(const appKey in newMapping) {
            const internalName = (newMapping as any)[appKey];
            reverseMapForReading[internalName] = appKey;
        }
        reverseDynamicSpFieldMapping = reverseMapForReading;


    } catch (error) {
        console.error("FATAL: Failed to build dynamic SharePoint mapping.", error);
        throw new Error("Could not initialize connection with SharePoint list schema.");
    }
};

const getWriteMapping = async () => {
    if (!dynamicSpFieldMapping) {
        await buildAndCacheDynamicMapping();
    }
    return dynamicSpFieldMapping!;
};

const getReadMapping = async () => {
    if(!reverseDynamicSpFieldMapping) {
        await buildAndCacheDynamicMapping();
    }
    return reverseDynamicSpFieldMapping!;
}


// Helper to map SharePoint list item to our typed SoxControl
const mapSharePointItemToSoxControl = async (item: any): Promise<SoxControl> => {
  const fields = item.fields;
  const readMapping = await getReadMapping();
  
  const soxControl: Partial<SoxControl> = {
    id: item.id,
    status: (fields.status as SoxControlStatus) || 'Ativo',
    lastUpdated: item.lastModifiedDateTime,
  };

  for(const spKey in fields) {
    const appKey = readMapping[spKey];
    if (appKey) {
        let value = fields[spKey];
        const booleanFields: (keyof SoxControl)[] = ['mrc', 'aplicavelIPE', 'ipe_C', 'ipe_EO', 'ipe_VA', 'ipe_OR', 'ipe_PD', 'impactoMalhaSul'];
        
        if (appKey === 'sistemasRelacionados' || appKey === 'executorControle') {
            value = typeof value === 'string' ? value.split(';').map(s => s.trim()) : [];
        } else if (booleanFields.includes(appKey as any)) {
            value = parseSharePointBoolean(value);
        }
        (soxControl as any)[appKey] = value;
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
            return Promise.all(response.value.map(mapSharePointItemToSoxControl));
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
    const spFieldMapping = await getWriteMapping();
  
    const fieldsToCreate: { [key: string]: any } = {};
  
    for (const key in controlData) {
        const appKey = key as keyof SoxControl;
        const spKey = (spFieldMapping as any)[appKey];
        const value = controlData[appKey];

        if (spKey) {
            // All columns are multiline text, so we format everything as a string.
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
        return await mapSharePointItemToSoxControl(response);
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
    
    // Ensure mapping is built before starting the loop
    await getWriteMapping();

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
