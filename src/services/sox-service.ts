
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
type ColumnMapping = {
    internalName: string;
    displayName: string;
    type: 'text' | 'note' | 'boolean' | 'dateTime' | 'choice' | 'multiChoice' | 'unsupported';
};

let spColumnMap: Map<string, ColumnMapping> | null = null; // Keyed by appKey (e.g., 'controlName')

const getColumnType = (spColumn: any): ColumnMapping['type'] => {
    if (spColumn.boolean) return 'boolean';
    if (spColumn.dateTime) return 'dateTime';
    if (spColumn.choice) {
        return spColumn.choice.allowMultipleValues ? 'multiChoice' : 'choice';
    }
    if (spColumn.note) return 'note';
    if (spColumn.text) return 'text';
    return 'unsupported';
};

/**
 * Fetches column definitions from SharePoint and builds a dynamic map.
 * This map includes internal name, display name, and data type for each relevant column.
 */
const buildAndCacheMappings = async (): Promise<void> => {
    if (spColumnMap) return;

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
        const newColumnMap = new Map<string, ColumnMapping>();
        
        // Create a reverse map from SP Display Name -> App Key for quick lookup
        const displayNameToAppKeyMap: { [key: string]: string } = {};
        for (const appKey in appToSpDisplayNameMapping) {
            const displayName = (appToSpDisplayNameMapping as any)[appKey];
            displayNameToAppKeyMap[displayName] = appKey;
        }

        for (const column of spColumns) {
            const appKey = displayNameToAppKeyMap[column.displayName];
            if (appKey) {
                newColumnMap.set(appKey, {
                    internalName: column.name,
                    displayName: column.displayName,
                    type: getColumnType(column),
                });
            }
        }
        
        spColumnMap = newColumnMap;

    } catch (error) {
        console.error("FATAL: Failed to build dynamic SharePoint mappings.", error);
        throw new Error("Could not initialize connection with SharePoint list schema.");
    }
};


// Helper to map SharePoint list item to our typed SoxControl
const mapSharePointItemToSoxControl = (item: any): SoxControl => {
    const spFields = item.fields;
    if (!spFields || !spColumnMap) return {} as SoxControl;

    const soxControl: Partial<SoxControl> = {
        id: item.id,
        status: (spFields.status as SoxControlStatus) || 'Ativo',
        lastUpdated: item.lastModifiedDateTime,
    };
    
    for (const [appKey, mapping] of spColumnMap.entries()) {
        const value = spFields[mapping.internalName];
        if (value !== undefined && value !== null) {
            if (mapping.type === 'boolean') {
                (soxControl as any)[appKey] = parseSharePointBoolean(value);
            } else if (mapping.type === 'multiChoice') {
                (soxControl as any)[appKey] = Array.isArray(value) ? value : String(value).split(/[,;]/).map(s => s.trim()).filter(Boolean);
            } else {
                (soxControl as any)[appKey] = value;
            }
        }
    }
    
    // Manual override for complex fields if necessary in the future
    if (spFields.Title) {
      soxControl.codigoAnterior = spFields.Title;
    }

    return soxControl as SoxControl;
};

export const getSoxControls = async (): Promise<SoxControl[]> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint site URL or list name is not configured.");
    }
    
    try {
        if (!spColumnMap) await buildAndCacheMappings();
        
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
        
        const response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items?expand=fields`)
            .get();

        if (response && response.value) {
            return response.value.map(item => mapSharePointItemToSoxControl(item));
        }
        return [];
    } catch (error) {
        console.error("Failed to get SOX controls from SharePoint:", error);
        return [];
    }
};

const formatValueForSharePoint = (value: any, type: ColumnMapping['type']): any => {
    if (value === undefined || value === null || String(value).trim() === '') {
        return null;
    }

    switch (type) {
        case 'boolean':
            return parseSharePointBoolean(value);
        case 'dateTime':
             // Handle Excel's numeric date format
            if (typeof value === 'number' && value > 1) {
                const excelEpoch = new Date(1899, 11, 30);
                const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
                return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
            }
             // Handle standard string dates
            const parsedDate = new Date(value);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toISOString().split('T')[0]; // Return YYYY-MM-DD
            }
            return null; // Invalid date
        case 'multiChoice':
             return String(value).split(/[,;]/).map(s => s.trim()).filter(Boolean);
        case 'note':
        case 'text':
        case 'choice':
             return String(value);
        default:
            return String(value);
    }
};


export const addSoxControl = async (rowData: { [key: string]: any }): Promise<any> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
      throw new Error("SharePoint site URL or list name is not configured.");
    }
    if (!spColumnMap) {
        await buildAndCacheMappings();
    }

    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
  
    const fieldsToCreate: { [key: string]: any } = {};
  
    for (const [appKey, mapping] of spColumnMap!.entries()) {
        const rawValue = rowData[mapping.displayName];
        const formattedValue = formatValueForSharePoint(rawValue, mapping.type);

        if (formattedValue !== null) {
            fieldsToCreate[mapping.internalName] = formattedValue;
        }
    }
    
    const newItem = { fields: fieldsToCreate };
  
    try {
        const response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items`)
            .post(newItem);
        return response;
    } catch (error: any) {
        let detailedMessage = '';

        // 1. Try to parse the modern graph error body (most common)
        if (error.body) {
            try {
                const errorBody = JSON.parse(error.body);
                const mainError = errorBody.error;
                if (mainError && mainError.message) {
                    detailedMessage = mainError.message;
                    if (mainError.innerError && mainError.innerError.message) {
                        detailedMessage += ` | Detalhes: ${mainError.innerError.message}`;
                    }
                }
            } catch (e) {
                // Ignore parsing errors, we'll try other methods
            }
        }

        // 2. If no message yet, try the top-level message property
        if (!detailedMessage && error.message) {
            detailedMessage = error.message;
        }

        // 3. If still no message, stringify the whole error object for raw details
        if (!detailedMessage) {
            try {
                // Avoid circular references and simplify the object for readability
                const simpleError = {
                    statusCode: error.statusCode,
                    code: error.code,
                    requestId: error.requestId,
                    body: error.body, // Include the raw body if it failed parsing
                };
                detailedMessage = `Erro não-padrão do SharePoint: ${JSON.stringify(simpleError)}`;
            } catch {
                detailedMessage = "Ocorreu um erro do SharePoint que não pôde ser serializado para detalhes.";
            }
        }

        // 4. Fallback if everything else fails
        if (!detailedMessage) {
            detailedMessage = 'Um erro desconhecido ocorreu na API do SharePoint.';
        }

        console.error("Full SharePoint Error Object:", error);
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
    if (!spColumnMap) {
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
            if (Object.values(row).every(val => val === null || String(val).trim() === '')) {
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

    
