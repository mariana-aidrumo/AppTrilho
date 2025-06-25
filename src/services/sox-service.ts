
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
import { parseSharePointBoolean, appToSpDisplayNameMapping } from '@/lib/sharepoint-utils';

// --- SharePoint Integration ---

const { SHAREPOINT_SITE_URL } = process.env;
const SHAREPOINT_CONTROLS_LIST_NAME = 'modelo_controles1';

// Cache for the dynamically generated mapping from appKey -> spInternalName
let dynamicSpFieldMapping: { [key: string]: string } | null = null;

/**
 * Fetches column definitions from SharePoint and builds a dynamic mapping
 * from our application's keys (e.g., 'controlName') to SharePoint's internal
 * field names (e.g., 'Nome_x0020_do_x0020_Controle').
 */
const buildAndCacheDynamicMapping = async (): Promise<void> => {
    if (dynamicSpFieldMapping) return;

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
        const spDisplayNameToInternalNameMap: { [key: string]: string } = {};

        // First, create a map of Display Name -> Internal Name from the SharePoint response
        for (const column of spColumns) {
            spDisplayNameToInternalNameMap[column.displayName] = column.name;
        }

        // Then, build our final mapping from App Key -> Internal Name
        for (const appKey in appToSpDisplayNameMapping) {
            const displayName = (appToSpDisplayNameMapping as any)[appKey];
            const internalName = spDisplayNameToInternalNameMap[displayName];
            
            if (internalName) {
                (newMapping as any)[appKey] = internalName;
            } else {
                 console.warn(`Could not find a SharePoint column with display name: '${displayName}'. Skipping this field for writes.`);
            }
        }
        
        // The user confirmed "Cód Controle ANTERIOR" is the Title field.
        // The internal name for the Title field is always "Title".
        newMapping.codigoAnterior = 'Title';
        
        dynamicSpFieldMapping = newMapping;
    } catch (error) {
        console.error("FATAL: Failed to build dynamic SharePoint mapping.", error);
        throw new Error("Could not initialize connection with SharePoint list schema.");
    }
};

/**
 * Returns the cached dynamic mapping, building it if it doesn't exist.
 */
const getWriteMapping = async () => {
    if (!dynamicSpFieldMapping) {
        await buildAndCacheDynamicMapping();
    }
    return dynamicSpFieldMapping!;
};

// Helper to map SharePoint list item to our typed SoxControl
const mapSharePointItemToSoxControl = (item: any, mapping: { [key: string]: string }): SoxControl => {
    const spFields = item.fields;
    if (!spFields) return {} as SoxControl;

    const soxControl: Partial<SoxControl> = {
        id: item.id, // Use top-level item ID
        status: (spFields.status as SoxControlStatus) || 'Ativo', // Assuming 'status' is an internal name
        lastUpdated: item.lastModifiedDateTime, // Use top-level datetime
    };
    
    // Iterate over OUR app's defined fields
    for (const appKey in appToSpDisplayNameMapping) {
        // Find the corresponding SharePoint internal name from our dynamic map
        const spInternalName = mapping[appKey];
        
        // If we have a mapping and the field exists in the response
        if (spInternalName && spFields[spInternalName] !== undefined) {
             let value = spFields[spInternalName];
             
             // Same data processing logic as before
             const booleanFields: (keyof SoxControl)[] = ['mrc', 'aplicavelIPE', 'ipe_C', 'ipe_EO', 'ipe_VA', 'ipe_OR', 'ipe_PD', 'impactoMalhaSul'];
             if (appKey === 'sistemasRelacionados' || appKey === 'executorControle') {
                 value = typeof value === 'string' ? value.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
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
        const mapping = await getWriteMapping(); // Get the dynamic mapping
        
        const response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items?expand=fields`)
            .get();

        if (response && response.value) {
            // Use the mapping to correctly interpret the response
            return response.value.map(item => mapSharePointItemToSoxControl(item, mapping));
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
  
    const writeMapping = await getWriteMapping();
    const fieldsToCreate: { [key: string]: any } = {};
  
    const readOnlyFields = ['id', 'lastUpdated', 'status', 'DocIcon', 'Attachments', 'ContentType', 'Edit', 'LinkTitle', 'ComplianceAssetId'];
  
    for (const appKey in writeMapping) {
      if (readOnlyFields.includes(appKey)) continue;
      
      const spInternalName = (writeMapping as any)[appKey];
      if (spInternalName) {
        const value = (controlData as any)[appKey];
        
        if (value === null || value === undefined || value === '') {
          fieldsToCreate[spInternalName] = null;
        } else if (Array.isArray(value)) {
          fieldsToCreate[spInternalName] = value.join('; ');
        } else if (typeof value === 'boolean') {
          fieldsToCreate[spInternalName] = value ? 'Sim' : 'Não';
        } else if (value instanceof Date) {
          fieldsToCreate[spInternalName] = value.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit'});
        } else {
          fieldsToCreate[spInternalName] = String(value);
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
        return mapSharePointItemToSoxControl(response, writeMapping);
    } catch (error: any) {
        console.error("Full SharePoint Error Object:", JSON.stringify(error, null, 2));
    
        let detailedMessage = 'Um erro desconhecido ocorreu.';
        
        try {
             if (error.body) {
                const errorBody = JSON.parse(error.body);
                if (errorBody.error && errorBody.error.message) {
                    detailedMessage = errorBody.error.message;
                } else {
                    detailedMessage = `SharePoint Error: ${error.body}`;
                }
            } else {
                detailedMessage = `General Error: ${JSON.stringify(error)}`;
            }
        } catch (stringifyError) {
             detailedMessage = "Ocorreu um erro, e a resposta de erro do SharePoint não pôde ser processada.";
        }

        console.error("Error details sending to SharePoint:", {
          itemSent: newItem,
          parsedErrorMessage: detailedMessage,
        });

        throw new Error(detailedMessage);
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
                message: error.message || 'Um erro desconhecido ocorreu durante o processamento em lote.' 
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
