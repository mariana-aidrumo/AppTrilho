
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

type ColumnMapping = {
    internalName: string;
    displayName: string;
    type: 'text' | 'note' | 'boolean' | 'dateTime' | 'choice' | 'multiChoice' | 'number' | 'unsupported';
};

const getColumnType = (spColumn: any): ColumnMapping['type'] => {
    if (spColumn.boolean) return 'boolean';
    if (spColumn.dateTime) return 'dateTime';
    if (spColumn.number) return 'number';
    if (spColumn.choice) {
        return spColumn.choice.allowMultipleValues ? 'multiChoice' : 'choice';
    }
    if (spColumn.note) return 'note';
    if (spColumn.text) return 'text';
    return 'unsupported';
};

/**
 * Fetches column definitions from SharePoint and builds a dynamic map ON-DEMAND.
 * This map includes internal name, display name, and data type for each relevant column.
 * It is intentionally NOT cached to always reflect the current state of the SharePoint list.
 */
const buildColumnMappings = async (): Promise<Map<string, ColumnMapping>> => {
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
        
        const displayNameToAppKeyMap: { [key: string]: string } = {};
        for (const appKey in appToSpDisplayNameMapping) {
            const displayName = (appToSpDisplayNameMapping as any)[appKey];
            displayNameToAppKeyMap[displayName] = appKey;
        }

        for (const column of spColumns) {
            if (column.hidden || column.readOnly) continue;
            
            // The link between our app and SP is the Display Name.
            // If it's renamed in SP, the link breaks. This is a necessary constraint for now.
            const appKey = displayNameToAppKeyMap[column.displayName];
            if (appKey) {
                newColumnMap.set(appKey, {
                    internalName: column.name,
                    displayName: column.displayName,
                    type: getColumnType(column),
                });
            }
        }
        
        return newColumnMap;

    } catch (error) {
        console.error("FATAL: Failed to build dynamic SharePoint mappings.", error);
        throw new Error("Could not initialize connection with SharePoint list schema.");
    }
};


const mapSharePointItemToSoxControl = (item: any, columnMap: Map<string, ColumnMapping>): SoxControl => {
    const spFields = item.fields;
    if (!spFields) return {} as SoxControl;

    const soxControl: Partial<SoxControl> = {
        id: item.id,
        status: (spFields.status as SoxControlStatus) || 'Ativo',
        lastUpdated: item.lastModifiedDateTime,
    };
    
    for (const [appKey, mapping] of columnMap.entries()) {
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
    
    return soxControl as SoxControl;
};

export const getSoxControls = async (): Promise<SoxControl[]> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint site URL or list name is not configured.");
    }
    
    try {
        const columnMap = await buildColumnMappings();
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
        
        const response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items?expand=fields`)
            .get();

        if (response && response.value) {
            return response.value.map(item => mapSharePointItemToSoxControl(item, columnMap));
        }
        return [];
    } catch (error) {
        console.error("Failed to get SOX controls from SharePoint:", error);
        return [];
    }
};

const formatValueForSharePoint = (value: any, type: ColumnMapping['type']): any => {
    if (value === undefined || value === null || String(value).trim() === '') {
        return undefined;
    }
    try {
        switch (type) {
            case 'boolean':
                return parseSharePointBoolean(value);
            case 'number':
                const num = parseFloat(String(value).replace(',', '.'));
                return isNaN(num) ? undefined : num;
            case 'dateTime':
                if (typeof value === 'number' && value > 1) {
                    const excelEpoch = new Date(1899, 11, 30);
                    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
                    return date.toISOString();
                }
                const parsedDate = new Date(value);
                return !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : undefined;
            case 'multiChoice':
                 return String(value).split(/[,;]/).map(s => s.trim()).filter(Boolean);
            default:
                 return String(value);
        }
    } catch (e) {
        console.error(`Failed to format value '${value}' for type '${type}':`, e);
        return undefined;
    }
};

export const addSoxControl = async (rowData: { [key: string]: any }): Promise<any> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
      throw new Error("SharePoint site URL or list name is not configured.");
    }

    const columnMap = await buildColumnMappings();
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
  
    const fieldsToCreate: { [key: string]: any } = {};

    // Create a reverse map from SP's current display name to our appKey
    const displayNameToAppKey = new Map<string, string>();
    for (const [appKey, mapping] of columnMap.entries()) {
        displayNameToAppKey.set(mapping.displayName, appKey);
    }
    
    // Iterate over the keys in the uploaded data (which are the dynamic display names from the template)
    for (const displayNameFromExcel in rowData) {
        const appKey = displayNameToAppKey.get(displayNameFromExcel);
        if (appKey) {
            const mapping = columnMap.get(appKey);
            if (mapping) {
                const rawValue = rowData[displayNameFromExcel];
                const formattedValue = formatValueForSharePoint(rawValue, mapping.type);
                if (formattedValue !== undefined) {
                    // Use the stable internal name for the API payload
                    fieldsToCreate[mapping.internalName] = formattedValue;
                }
            }
        }
    }
  
    if (Object.keys(fieldsToCreate).length === 0) {
        throw new Error("Nenhum dado válido encontrado para importar. Verifique se os cabeçalhos das colunas no arquivo Excel correspondem aos do SharePoint.");
    }
  
    const newItem = { fields: fieldsToCreate };
  
    try {
        const response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items`)
            .post(newItem);
        return response;
    } catch (error: any) {
        let detailedMessage = "Ocorreu um erro desconhecido ao gravar no SharePoint.";
        if (error?.body) {
            try {
                const errorBody = JSON.parse(error.body);
                detailedMessage = errorBody?.error?.message || error.body;
            } catch (e) {
                detailedMessage = error.body;
            }
        } else if (error?.message) {
            detailedMessage = error.message;
        }
        
        console.error("--- DETAILED SHAREPOINT API ERROR ---");
        console.error("TIMESTAMP:", new Date().toISOString());
        console.error("ITEM SENT TO SHAREPOINT:", JSON.stringify(newItem, null, 2));
        console.error("FULL ERROR OBJECT:", JSON.stringify(error, null, 2));
        console.error("--- END OF DETAILED ERROR ---");

        throw new Error(detailedMessage);
    }
};


export const addSoxControlsInBulk = async (controls: { [key: string]: any }[]): Promise<{ controlsAdded: number; errors: { controlId?: string; message: string }[] }> => {
    let controlsAdded = 0;
    const errors: { controlId?: string; message: string }[] = [];
    
    // Attempt to get a sample identifier display name for error reporting
    const controlIdDisplayName = appToSpDisplayNameMapping.controlId || "ID do Controle";

    for (const row of controls) {
        const controlIdentifier = row[controlIdDisplayName] || 'ID Desconhecido';
        try {
            if (Object.values(row).every(val => val === null || val === undefined || String(val).trim() === '')) {
                continue;
            }
            await addSoxControl(row);
            controlsAdded++;
        } catch (error: any) {
            errors.push({ 
                controlId: controlIdentifier, 
                message: error.message || 'Ocorreu um erro desconhecido durante o processamento em massa.' 
            });
        }
    }
    return { controlsAdded, errors };
};

export const getSharePointColumnHeaders = async (): Promise<string[]> => {
    const columnMap = await buildColumnMappings();
    
    // Maintain a consistent order by iterating through our source-of-truth mapping object
    const orderedDisplayNames: string[] = [];
    for (const appKey in appToSpDisplayNameMapping) {
        const mapping = columnMap.get(appKey);
        if (mapping) {
            orderedDisplayNames.push(mapping.displayName);
        }
    }
    
    return orderedDisplayNames;
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
