
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

// Caches for mappings
let readMapping: { [key: string]: string } | null = null;
let writeMapping: { [key: string]: string } | null = null;

/**
 * Fetches column definitions from SharePoint and builds dynamic mappings for reading and writing.
 * This is the single source of truth for field name translations.
 */
const buildAndCacheMappings = async (): Promise<void> => {
    if (readMapping && writeMapping) return;

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
        const newReadMapping: { [key: string]: string } = {};
        const newWriteMapping: { [key: string]: string } = {};
        const spDisplayNameToInternalNameMap: { [key: string]: string } = {};

        for (const column of spColumns) {
            spDisplayNameToInternalNameMap[column.displayName] = column.name;
        }

        for (const appKey in appToSpDisplayNameMapping) {
            const displayName = (appToSpDisplayNameMapping as any)[appKey];
            const internalName = spDisplayNameToInternalNameMap[displayName];
            
            if (internalName) {
                (newReadMapping as any)[appKey] = internalName;
                newWriteMapping[displayName] = internalName;
            }
        }
        
        // Handle the special case for the 'Title' field which is mapped to 'codigoAnterior'
        if(spDisplayNameToInternalNameMap['Cód Controle ANTERIOR']) {
            newReadMapping.codigoAnterior = spDisplayNameToInternalNameMap['Cód Controle ANTERIOR'];
        } else {
            newReadMapping.codigoAnterior = 'Title'; // Fallback
        }
        newWriteMapping['Cód Controle ANTERIOR'] = newReadMapping.codigoAnterior;
        
        readMapping = newReadMapping;
        writeMapping = newWriteMapping;
    } catch (error) {
        console.error("FATAL: Failed to build dynamic SharePoint mappings.", error);
        throw new Error("Could not initialize connection with SharePoint list schema.");
    }
};


// Helper to map SharePoint list item to our typed SoxControl
const mapSharePointItemToSoxControl = (item: any, mapping: { [key: string]: string }): SoxControl => {
    const spFields = item.fields;
    if (!spFields) return {} as SoxControl;

    const soxControl: Partial<SoxControl> = {
        id: item.id,
        status: (spFields.status as SoxControlStatus) || 'Ativo',
        lastUpdated: item.lastModifiedDateTime,
    };
    
    for (const appKey in appToSpDisplayNameMapping) {
        // Skip keys that are not meant to be read directly or are handled specially
        if (appKey === 'ipeAssertions' ) continue;

        const spInternalName = mapping[appKey];
        
        if (spInternalName && spFields[spInternalName] !== undefined) {
             let value = spFields[spInternalName];
             
             const booleanFields: (keyof SoxControl)[] = ['mrc', 'aplicavelIPE', 'ipe_C', 'ipe_EO', 'ipe_VA', 'ipe_OR', 'ipe_PD', 'impactoMalhaSul'];
             const arrayFields: (keyof SoxControl)[] = ['sistemasRelacionados', 'executorControle'];

             if (arrayFields.includes(appKey as any)) {
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
        if (!readMapping) await buildAndCacheMappings();
        
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
        
        const response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items?expand=fields`)
            .get();

        if (response && response.value) {
            return response.value.map(item => mapSharePointItemToSoxControl(item, readMapping!));
        }
        return [];
    } catch (error) {
        console.error("Failed to get SOX controls from SharePoint:", error);
        return [];
    }
};

export const addSoxControl = async (rowData: { [key: string]: any }): Promise<any> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
      throw new Error("SharePoint site URL or list name is not configured.");
    }
    if (!writeMapping) {
        await buildAndCacheMappings();
    }

    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
  
    const fieldsToCreate: { [key: string]: any } = {};
  
    // STRATEGY: Iterate over the KNOWN display names from our write mapping.
    // This ensures we only try to write to fields we know about and are valid for creation.
    for (const displayName in writeMapping!) {
        const internalName = writeMapping![displayName];
        const value = rowData[displayName];
        
        // Don't try to write read-only system fields
        if (['id', 'lastUpdated', 'status'].includes(internalName.toLowerCase())) {
            continue;
        }

        if (value === undefined || value === null || String(value).trim() === '') {
          fieldsToCreate[internalName] = null;
        } else {
          fieldsToCreate[internalName] = String(value); // Convert everything to string for safety
        }
    }

    const newItem = { fields: fieldsToCreate };
  
    try {
        const response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items`)
            .post(newItem);
        return response;
    } catch (error: any) {
        // Robust error handling to extract the real message
        console.error("Full SharePoint Error Object:", JSON.stringify(error, null, 2));
    
        let detailedMessage = 'Um erro desconhecido ocorreu.';
        if (error.body) {
            try {
                const errorBody = JSON.parse(error.body);
                if (errorBody.error && errorBody.error.message) {
                    detailedMessage = `SharePoint Error: ${errorBody.error.message}`;
                }
            } catch (e) {
                // If parsing fails, the body might just be a plain text message
                detailedMessage = `Ocorreu um erro, e a resposta de erro do SharePoint não pôde ser processada: ${error.body}`;
            }
        } else if (error.message) {
             detailedMessage = error.message;
        }
        
        console.error("Error details sending to SharePoint:", {
          itemSent: newItem,
          parsedErrorMessage: detailedMessage,
        });

        throw new Error(detailedMessage);
    }
};


export const addSoxControlsInBulk = async (controls: { [key: string]: any }[]): Promise<{ controlsAdded: number; errors: { controlId?: string; message: string }[] }> => {
    let controlsAdded = 0;
    const errors: { controlId?: string; message: string }[] = [];
    
    // Ensure mappings are built before starting the loop
    if (!writeMapping) {
        try {
            await buildAndCacheMappings();
        } catch (mappingError: any) {
            errors.push({ controlId: 'Setup', message: `Falha ao inicializar: ${mappingError.message}`});
            return { controlsAdded, errors };
        }
    }
    
    for (const row of controls) {
        // Use display names from our mapping to identify the control in error messages
        const controlIdDisplayName = appToSpDisplayNameMapping.controlId!;
        const controlNameDisplayName = appToSpDisplayNameMapping.controlName!;
        const controlIdentifier = row[controlIdDisplayName] || row[controlNameDisplayName] || 'ID Desconhecido';

        try {
            // Skip rows that seem empty
            if (Object.values(row).every(val => val === null || val === '')) {
                continue;
            }
            await addSoxControl(row);
            controlsAdded++;
        } catch (error: any) {
            errors.push({ 
                controlId: controlIdentifier, 
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
