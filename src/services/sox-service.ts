
// src/services/sox-service.ts
'use server';

import { getGraphClient, getSiteId, getListId } from './sharepoint-client';
import type { SoxControl, ChangeRequest, MockUser, Notification, VersionHistoryEntry, UserProfileType, SoxControlStatus, SharePointColumn, TenantUser } from '@/types';
import {
  mockChangeRequests,
  mockUsers,
  mockNotifications,
  mockVersionHistory,
} from '@/data/mock-data';
import { parseSharePointBoolean, appToSpDisplayNameMapping } from '@/lib/sharepoint-utils';

// --- SharePoint Integration ---

const SHAREPOINT_SITE_URL = process.env.SHAREPOINT_SITE_URL;
const SHAREPOINT_CONTROLS_LIST_NAME = 'LISTA-MATRIZ-SOX';

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
    // A 'note' field is a text field that allows multiple lines.
    if (spColumn.text) {
        return spColumn.text.allowMultipleLines ? 'note' : 'text';
    }
    return 'unsupported';
};

/**
 * Fetches column definitions from SharePoint and builds a dynamic map.
 * This is intentionally NOT cached to always reflect the current state.
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
        
        for (const column of spColumns) {
            if (column.hidden || column.readOnly) continue;
             newColumnMap.set(column.displayName, {
                internalName: column.name,
                displayName: column.displayName,
                type: getColumnType(column),
            });
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
    
    const displayNameToAppKey: { [key: string]: string } = Object.entries(
      appToSpDisplayNameMapping
    ).reduce((acc, [key, value]) => ({ ...acc, [value]: key }), {});

    columnMap.forEach((mapping, displayName) => {
        const value = spFields[mapping.internalName];

        if (value !== undefined && value !== null && String(value).trim() !== '') {
            // Use the predefined appKey if it exists, otherwise use the displayName as the key
            const key = displayNameToAppKey[displayName] || displayName;
            
            let formattedValue = value;
            if (mapping.type === 'boolean') {
                formattedValue = parseSharePointBoolean(value);
            } else if (mapping.type === 'multiChoice') {
                formattedValue = Array.isArray(value) ? value : String(value).split(/[,;]/).map(s => s.trim()).filter(Boolean);
            }
            
            (soxControl as any)[key] = formattedValue;
        }
    });

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
                    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
                }
                const parsedDate = new Date(value);
                return !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().split('T')[0] : undefined;
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
    
    for (const appKey in appToSpDisplayNameMapping) {
        const displayName = (appToSpDisplayNameMapping as any)[appKey];
        const mapping = columnMap.get(displayName);
        if (mapping && rowData.hasOwnProperty(displayName)) {
             const rawValue = rowData[displayName];
             const formattedValue = formatValueForSharePoint(rawValue, mapping.type);
             if (formattedValue !== undefined) {
                 fieldsToCreate[mapping.internalName] = formattedValue;
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
        console.error("--- DETAILED SHAREPOINT API ERROR ---");
        console.error("TIMESTAMP:", new Date().toISOString());
        console.error("ITEM SENT TO SHAREPOINT:", JSON.stringify(newItem, null, 2));
        console.error("FULL ERROR OBJECT:", JSON.stringify(error, null, 2));
        
        let detailedMessage = "Ocorreu um erro desconhecido ao gravar no SharePoint.";
        if (error?.body) {
            try {
                const errorBody = JSON.parse(error.body);
                if(errorBody?.error?.message) {
                  detailedMessage = errorBody.error.message;
                } else if (errorBody?.error) {
                  detailedMessage = JSON.stringify(errorBody.error);
                } else {
                  detailedMessage = error.body;
                }
            } catch (e) {
                detailedMessage = error.body;
            }
        } else if (error?.message) {
            detailedMessage = error.message;
        }
        
        throw new Error(detailedMessage);
    }
};


export const addSoxControlsInBulk = async (controls: { [key: string]: any }[]): Promise<{ controlsAdded: number; errors: { controlId?: string; message: string }[] }> => {
    let controlsAdded = 0;
    const errors: { controlId?: string; message: string }[] = [];
    
    let controlIdDisplayName = "ID do Controle";
    try {
        const columnMap = await buildColumnMappings();
        const appKeyForControlId = Object.keys(appToSpDisplayNameMapping).find(key => (appToSpDisplayNameMapping as any)[key] === "Codigo NOVO");
        if (appKeyForControlId) {
             const displayName = (appToSpDisplayNameMapping as any)[appKeyForControlId];
             if (displayName) controlIdDisplayName = displayName;
        }
    } catch (e) { /* Use default name on error */ }

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

export const getSharePointColumnDetails = async (): Promise<SharePointColumn[]> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint configuration is missing.");
    }
    try {
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);

        const response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/columns`)
            .select('displayName,hidden,readOnly,name,text,number,boolean,choice,dateTime')
            .get();

        if (!response || !response.value) {
            throw new Error("Could not fetch column definitions from SharePoint.");
        }

        const spColumns = response.value;
        // The 'Title' column is special and often not needed for management. Filter it out along with other system columns.
        const systemColumnInternalNames = new Set(['Title', 'ContentType', 'Attachments', 'Edit', 'DocIcon', 'LinkTitleNoMenu', 'LinkTitle', 'ItemChildCount', 'FolderChildCount', '_UIVersionString']);

        const allColumns: SharePointColumn[] = spColumns
            .filter((column: any) => !column.hidden && !column.readOnly && !systemColumnInternalNames.has(column.name))
            .map((column: any) => ({
                displayName: column.displayName,
                internalName: column.name,
                type: getColumnType(column),
            }));
        
        return allColumns;
    } catch (error: any) {
        console.error("FATAL: Failed to get SharePoint column details.", error);
        
        let detailedMessage = "Ocorreu um erro desconhecido ao buscar os detalhes das colunas.";
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
        
        throw new Error(detailedMessage);
    }
};

export const addSharePointColumn = async (columnData: { displayName: string; type: 'text' | 'note' | 'number' | 'boolean' }) => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint configuration is missing.");
    }

    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);

    // Generate a safe internal name
    const internalName = columnData.displayName.replace(/[^a-zA-Z0-9]/g, '');
    if (!internalName) {
        throw new Error("O nome da coluna é inválido. Use apenas letras e números.");
    }

    let payload: any;
    if (columnData.type === 'note') {
        payload = {
            displayName: columnData.displayName,
            name: internalName,
            text: {
                allowMultipleLines: true,
                linesForEditing: 6, // A reasonable default
            },
        };
    } else {
        payload = {
            displayName: columnData.displayName,
            name: internalName,
            [columnData.type]: {},
        };
    }


    try {
        await graphClient.api(`/sites/${siteId}/lists/${listId}/columns`).post(payload);
        return { success: true, name: columnData.displayName };
    } catch (error: any) {
        console.error("--- FAILED TO ADD SHAREPOINT COLUMN ---");
        console.error("Payload:", JSON.stringify(payload, null, 2));
        console.error("Error:", JSON.stringify(error, null, 2));
        
        let detailedMessage = "Ocorreu um erro ao criar a coluna no SharePoint.";
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
        throw new Error(detailedMessage);
    }
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

/**
 * Fetches users from the Azure AD tenant.
 */
export const getTenantUsers = async (): Promise<TenantUser[]> => {
  try {
    const graphClient = await getGraphClient();
    // Use an advanced query with ConsistencyLevel header to filter by domain
    const response = await graphClient
      .api('/users')
      .header('ConsistencyLevel', 'eventual')
      .count(true) // Required for advanced filters
      .filter("endsWith(userPrincipalName, '@rumolog.com') or endsWith(userPrincipalName, '@ext.rumolog.com')")
      .select('id,displayName,userPrincipalName')
      .get();
    
    if (response && response.value) {
      return response.value.map((user: any) => ({
        id: user.id,
        name: user.displayName,
        email: user.userPrincipalName,
      }));
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch tenant users from Graph API:", error);
    throw new Error("Could not retrieve users from the directory.");
  }
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
