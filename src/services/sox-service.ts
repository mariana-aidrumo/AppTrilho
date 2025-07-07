
// src/services/sox-service.ts
'use server';

import { getGraphClient, getSiteId, getListId } from './sharepoint-client';
import type { SoxControl, ChangeRequest, MockUser, Notification, VersionHistoryEntry, UserProfileType, SoxControlStatus, SharePointColumn, TenantUser, ChangeRequestStatus } from '@/types';
import {
  mockUsers,
  mockNotifications,
  mockVersionHistory,
  mockSoxControls,
} from '@/data/mock-data';
import { parseSharePointBoolean, appToSpDisplayNameMapping } from '@/lib/sharepoint-utils';

// --- SharePoint Integration ---

const SHAREPOINT_SITE_URL = process.env.SHAREPOINT_SITE_URL;
const SHAREPOINT_CONTROLS_LIST_NAME = 'LISTA-MATRIZ-SOX';
const SHAREPOINT_HISTORY_LIST_NAME = 'REGISTRO-MATRIZ';

let controlsColumnMapCache: Map<string, string> | null = null;

// Dynamically gets and caches the column mapping for the controls list
async function getControlsColumnMapping(): Promise<Map<string, string>> {
    if (controlsColumnMapCache) {
        return controlsColumnMapCache;
    }

    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint configuration is missing for controls list.");
    }
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);

    const response = await graphClient
        .api(`/sites/${siteId}/lists/${listId}/columns`)
        .select('displayName,name')
        .get();
    
    if (!response || !response.value) {
      throw new Error("Could not fetch column details from SharePoint for mapping.");
    }

    const mapping = new Map<string, string>();
    for (const column of response.value) {
        mapping.set(column.displayName, column.name);
    }
    
    controlsColumnMapCache = mapping;
    return mapping;
}

export const getSharePointColumnDetails = async (): Promise<SharePointColumn[]> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint configuration is missing.");
    }
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
    const systemColumnInternalNames = new Set(['Title', 'ContentType', 'Attachments', 'Edit', 'DocIcon', 'LinkTitleNoMenu', 'LinkTitle', 'ItemChildCount', 'FolderChildCount', '_UIVersionString', '_ComplianceTag', '_ComplianceTagWrittenTime', '_ComplianceTagUserId']);
    
    // Fetch all column properties by removing the .select() clause
    const response = await graphClient
        .api(`/sites/${siteId}/lists/${listId}/columns`)
        .get();

    if (!response || !response.value) {
      throw new Error("Could not fetch column details from SharePoint.");
    }

    // A more comprehensive way to determine type, falling back to 'text'
    const getColumnType = (spColumn: any): SharePointColumn['type'] => {
        if (spColumn.boolean) return 'boolean';
        if (spColumn.dateTime) return 'dateTime';
        if (spColumn.number) return 'number';
        if (spColumn.choice) return spColumn.choice.allowMultipleValues ? 'multiChoice' : 'choice';
        if (spColumn.text) return spColumn.text.allowMultipleLines ? 'note' : 'text';
        if (spColumn.lookup) return 'text'; // Treat lookups as text for display
        if (spColumn.personOrGroup) return 'text'; // Treat people as text for display
        return 'unsupported'; // Default to unsupported for any other type
    };

    return response.value
        .filter((column: any) => !column.hidden && !column.readOnly && !systemColumnInternalNames.has(column.name))
        .map((column: any) => ({
            displayName: column.displayName,
            internalName: column.name,
            type: getColumnType(column), // Type is now more general
        }));
};

const mapSharePointItemToSoxControl = (item: any, columnDetails: SharePointColumn[]): SoxControl => {
    const spFields = item.fields;
    if (!spFields) return {} as SoxControl;

    // Create a reverse map from SharePoint Display Name to our application's key
    const spDisplayNameToAppKeyMap = Object.entries(appToSpDisplayNameMapping).reduce((acc, [appKey, spName]) => {
        acc[spName] = appKey as keyof SoxControl;
        return acc;
    }, {} as Record<string, keyof SoxControl>);

    const soxControl: Partial<SoxControl> = {
        id: item.id,
        spListItemId: item.id,
        lastUpdated: spFields.lastModifiedDateTime || spFields.Modified,
    };

    const booleanFields = new Set(['mrc', 'aplicavelIPE', 'ipe_C', 'ipe_EO', 'ipe_VA', 'ipe_OR', 'ipe_PD', 'impactoMalhaSul']);
    
    // Iterate through all columns returned by SharePoint for this list
    for (const column of columnDetails) {
        const { displayName, internalName } = column;

        // Find the corresponding key in our application's data model (e.g., 'controlId')
        const appKey = spDisplayNameToAppKeyMap[displayName];
        
        // If it's a field we care about and it has a value in the SharePoint item
        if (appKey && spFields[internalName] !== undefined && spFields[internalName] !== null) {
            let value = spFields[internalName];

            // Handle boolean fields, which might be "Sim"/"Não", true/false, etc.
            if (booleanFields.has(appKey)) {
                value = parseSharePointBoolean(value);
            } 
            // Handle multi-value fields (e.g., multi-lookup or multi-person)
            else if (Array.isArray(value) && value.length > 0) {
                value = value.map(subItem => {
                    if (subItem && typeof subItem === 'object') {
                        if ('lookupValue' in subItem) return subItem.lookupValue;
                        if ('DisplayName' in subItem) return subItem.DisplayName;
                        if ('Title' in subItem) return subItem.Title;
                    }
                    return String(subItem);
                });
            } 
            // Handle single-value complex fields (e.g., single lookup or person)
            else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
                if ('lookupValue' in value) value = value.lookupValue;
                else if ('DisplayName' in value) value = value.DisplayName;
                else if ('Title' in value) value = value.Title;
            }
            
            (soxControl as any)[appKey] = value;
        }
    }
    
    // Ensure status is correctly set
    if (spFields.Status) {
        soxControl.status = spFields.Status as SoxControlStatus;
    } else {
        soxControl.status = 'Ativo';
    }

    return soxControl as SoxControl;
};

export const getSoxControls = async (): Promise<SoxControl[]> => {
    if (process.env.USE_MOCK_DATA === 'true') {
        return JSON.parse(JSON.stringify(mockSoxControls));
    }
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint site URL or list name is not configured.");
    }
    try {
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
        
        // 1. Fetch all column definitions for this list to get displayName -> internalName mapping
        const columnDetails = await getSharePointColumnDetails();
        
        // 2. Fetch all list items
        let response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items?expand=fields(select=*)`)
            .get();

        const allItems: any[] = [];
        while (response && response.value) {
            allItems.push(...response.value);
            if (response['@odata.nextLink']) {
                response = await graphClient.api(response['@odata.nextLink']).get();
            } else {
                break;
            }
        }
        
        // 3. Map each raw SharePoint item to a structured SoxControl object
        const allControls = allItems.map(item => mapSharePointItemToSoxControl(item, columnDetails));
        
        return allControls;

    } catch (error: any) {
        console.error("Failed to get SOX controls from SharePoint:", error);
        // Better to re-throw so the UI can show a proper error message
        throw new Error(`Could not retrieve SOX controls from SharePoint. Reason: ${error.message}`);
    }
};

export const updateSoxControlField = async (
  spListItemId: string,
  fieldToUpdate: { appKey: keyof SoxControl; value: any }
): Promise<any> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint configuration is missing for controls list.");
    }

    if (!spListItemId) {
        throw new Error("SharePoint List Item ID is required for updating.");
    }
    
    try {
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
        const columnMap = await getControlsColumnMapping();

        const { appKey, value } = fieldToUpdate;

        // Find the SharePoint display name from our mapping
        const spDisplayName = (appToSpDisplayNameMapping as any)[appKey];
        if (!spDisplayName) {
            console.warn(`No SharePoint display name mapping found for app key '${appKey}'. Attempting to update using app key directly.`);
        }

        // Find the SharePoint internal name from the dynamically fetched map
        const spInternalName = columnMap.get(spDisplayName);
        if (!spInternalName) {
            throw new Error(`Could not find SharePoint internal column name for '${spDisplayName || appKey}'. The column may not exist or is not accessible.`);
        }

        // Prepare the value, especially for boolean fields
        const booleanFields = new Set(['mrc', 'aplicavelIPE', 'ipe_C', 'ipe_EO', 'ipe_VA', 'ipe_OR', 'ipe_PD', 'impactoMalhaSul']);
        let finalValue = value;
        if (booleanFields.has(appKey)) {
            finalValue = parseSharePointBoolean(finalValue);
        }

        const fieldsToUpdate = {
            [spInternalName]: finalValue
        };

        return await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items/${spListItemId}/fields`)
            .patch(fieldsToUpdate);

    } catch (error: any) {
        console.error(`Failed to update field '${fieldToUpdate.appKey}' on item '${spListItemId}' in SharePoint:`, error);
        
        let detailedMessage = `Could not update field in SharePoint. Reason: ${error.message}`;
        if (error.body) {
            try {
                const errorBody = JSON.parse(error.body);
                if (errorBody.error?.message) {
                    detailedMessage += ` SharePoint Error: ${errorBody.error.message}`;
                }
            } catch (e) { /* ignore parse error */ }
        }
        
        throw new Error(detailedMessage);
    }
};


export const addSoxControl = async (rowData: { [key: string]: any }): Promise<any> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
      throw new Error("SharePoint site URL or list name is not configured.");
    }
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
    const columnMap = await getControlsColumnMapping();
    const fieldsToCreate: { [key: string]: any } = {};

    for(const [displayName, value] of Object.entries(rowData)) {
        const internalName = columnMap.get(displayName);
        if (internalName) {
            fieldsToCreate[internalName] = value;
        } else {
             fieldsToCreate[displayName] = value;
        }
    }
  
    const newItem = { fields: fieldsToCreate };
    return graphClient.api(`/sites/${siteId}/lists/${listId}/items`).post(newItem);
};

export const addSoxControlsInBulk = async (controls: { [key: string]: any }[]): Promise<{ controlsAdded: number; errors: { controlId?: string; message: string }[] }> => {
    let controlsAdded = 0;
    const errors: { controlId?: string; message: string }[] = [];
    
    for (const row of controls) {
        try {
            await addSoxControl(row);
            controlsAdded++;
        } catch (error: any) {
            errors.push({ controlId: row['Código NOVO'] || 'ID Desconhecido', message: error.message });
        }
    }
    return { controlsAdded, errors };
};

export const addSharePointColumn = async (columnData: { displayName: string; type: 'text' | 'note' | 'number' | 'boolean' }) => {
    // This function can be improved, but is not part of the current fix.
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) throw new Error("SharePoint configuration is missing.");

    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
    const internalName = columnData.displayName.replace(/[^a-zA-Z0-9]/g, '');
    let payload: any;
    if (columnData.type === 'note') payload = { name: internalName, text: { allowMultipleLines: true } };
    else payload = { name: internalName, [columnData.type]: {} };
    payload.displayName = columnData.displayName;
    return graphClient.api(`/sites/${siteId}/lists/${listId}/columns`).post(payload);
};


// --- Change Request Services ---

const mapHistoryItemToChangeRequest = (item: any): ChangeRequest | null => {
    const fields = item.fields;
    if (!fields) return null;

    const detailsJson = fields.field_7 || '{}';
    let comments = '';
    let changes = {};

    try {
        const parsedDetails = JSON.parse(detailsJson);
        comments = parsedDetails.summary || '';
        if (parsedDetails.fieldName && parsedDetails.newValue !== undefined) {
            changes = { [parsedDetails.fieldName]: parsedDetails.newValue };
        }
    } catch (e) {
        // Fallback for old data that might have been a simple string
        comments = detailsJson;
    }
    
    const request: ChangeRequest = {
        id: fields.Title, // ID da Solicitação
        spListItemId: item.id,
        controlId: fields.field_4, 
        controlName: fields.field_3, 
        requestType: fields.field_2 || 'Alteração', 
        requestedBy: fields.field_5 || "Não encontrado", 
        requestDate: fields.field_6 || item.lastModifiedDateTime,
        status: fields.field_8 || 'Pendente', // Status
        comments: comments, // Parsed human-readable summary
        changes: changes, // Parsed technical changes
        reviewedBy: fields.field_10, // Revisado Por
        reviewDate: fields.field_11, // Data Revisão
        adminFeedback: fields.field_12 || '', // Feedback do Admin
    };
    
    return request;
};

export const getChangeRequests = async (): Promise<ChangeRequest[]> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_HISTORY_LIST_NAME) {
        throw new Error("SharePoint history list name is not configured.");
    }
    try {
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const historyListId = await getListId(graphClient, siteId, SHAREPOINT_HISTORY_LIST_NAME);

        let response = await graphClient
            .api(`/sites/${siteId}/lists/${historyListId}/items?expand=fields`)
            .get();

        const allItems: any[] = [];
        while (response && response.value) {
            allItems.push(...response.value);
            if (response['@odata.nextLink']) {
                response = await graphClient.api(response['@odata.nextLink']).get();
            } else {
                break;
            }
        }
        
        const allRequests = allItems
            .map(item => mapHistoryItemToChangeRequest(item))
            .filter((req): req is ChangeRequest => req !== null);
        
        allRequests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
        
        return allRequests;
    } catch (error: any) {
        console.error("Failed to get Change Requests from SharePoint:", error);
        throw new Error(`Could not retrieve change requests from SharePoint. Reason: ${error.message}`);
    }
};

export const addChangeRequest = async (requestData: Partial<ChangeRequest> & { fieldName?: string; newValue?: any }): Promise<ChangeRequest> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_HISTORY_LIST_NAME) {
      throw new Error("SharePoint history list name is not configured.");
    }
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const historyListId = await getListId(graphClient, siteId, SHAREPOINT_HISTORY_LIST_NAME);
    
    const newRequestId = `cr-new-${Date.now()}`;
    const requestDate = new Date().toISOString();

    const changeDetails = {
        summary: requestData.comments || '',
        fieldName: requestData.fieldName,
        newValue: requestData.newValue,
    };

    const fieldsToCreate: {[key: string]: any} = {
        'Title': newRequestId,
        'field_2': requestData.requestType,
        'field_3': requestData.controlName,
        'field_4': requestData.controlId,
        'field_5': requestData.requestedBy,
        'field_6': requestDate,
        'field_7': JSON.stringify(changeDetails), // All details in one structured field
        'field_8': "Pendente",
    };
    
    const response = await graphClient.api(`/sites/${siteId}/lists/${historyListId}/items`).post({ fields: fieldsToCreate });
    return { ...requestData, id: newRequestId, spListItemId: response.id, requestDate, status: 'Pendente' } as ChangeRequest;
};

export const updateChangeRequestStatus = async (
  requestId: string,
  newStatus: 'Aprovado' | 'Rejeitado',
  reviewedBy: string,
  adminFeedback?: string
): Promise<ChangeRequest> => {
    const allRequests = await getChangeRequests();
    const requestToUpdate = allRequests.find(req => req.id === requestId);

    if (!requestToUpdate || !requestToUpdate.spListItemId) {
        throw new Error(`Solicitação com ID ${requestId} não encontrada ou não possui um ID de item do SharePoint.`);
    }

    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL!);
    
    // --- PASSO 1: ATUALIZAR A LISTA DE REGISTRO-MATRIZ ---
    try {
        const historyListId = await getListId(graphClient, siteId, SHAREPOINT_HISTORY_LIST_NAME!);
        
        const fieldsForHistoryUpdate: { [key: string]: any } = {
            'field_8': newStatus,                 // Status
            'field_10': reviewedBy,               // Revisado Por
            'field_11': new Date().toISOString(), // Data Revisão
            'field_12': adminFeedback || '',      // Feedback do Admin
        };
        
        await graphClient.api(`/sites/${siteId}/lists/${historyListId}/items/${requestToUpdate.spListItemId}/fields`).patch(fieldsForHistoryUpdate);
    } catch (error: any) {
        console.error("Erro no PASSO 1 (Atualizar Histórico):", JSON.stringify(error, null, 2));
        let detailedMessage = "Ocorreu um erro ao atualizar o status da solicitação no histórico (PASSO 1).";
        
        if (error.body) {
            try {
                const errorBody = JSON.parse(error.body);
                if (errorBody.error?.message) {
                    detailedMessage += ` SharePoint Error: ${errorBody.error.message}`;
                } else {
                    detailedMessage += ` SharePoint returned an error body: ${error.body}`;
                }
            } catch (parseError) {
                detailedMessage += ` Invalid request to SharePoint. Raw response: ${error.body}`;
            }
        } else if (error.message) {
            detailedMessage += ` Details: ${error.message}`;
        }
        
        if (error.statusCode) {
            detailedMessage += ` (Status code: ${error.statusCode})`;
        }
        
        throw new Error(detailedMessage);
    }

    // --- PASSO 2: APLICAR ALTERAÇÕES NA MATRIZ PRINCIPAL (SE APROVADO) ---
    if (newStatus === 'Aprovado') {
        try {
            if (requestToUpdate.requestType === 'Alteração') {
                const allControls = await getSoxControls();
                const controlToUpdate = allControls.find(c => c.controlId === requestToUpdate.controlId);
                    
                if (!controlToUpdate || !controlToUpdate.id) {
                    throw new Error(`Controle principal com ID '${requestToUpdate.controlId}' não encontrado na matriz para aplicar a alteração.`);
                }
                
                const controlItemSpId = controlToUpdate.id;
                const controlsListId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME!);
                const controlsColumnMap = await getControlsColumnMapping();
                const changesToApply = requestToUpdate.changes;
                
                if (Object.keys(changesToApply).length > 0) {
                   const dynamicChanges: {[key: string]: any} = {};
                    for (const [appKey, value] of Object.entries(changesToApply)) {
                        const spDisplayName = (appToSpDisplayNameMapping as any)[appKey];
                        if(spDisplayName) {
                            const spInternalName = controlsColumnMap.get(spDisplayName);
                            if(spInternalName) {
                                let finalValue = value;
                                const booleanFields = new Set(['mrc', 'aplicavelIPE', 'ipe_C', 'ipe_EO', 'ipe_VA', 'ipe_OR', 'ipe_PD', 'impactoMalhaSul']);
                                if(booleanFields.has(appKey)){
                                    finalValue = parseSharePointBoolean(finalValue);
                                }
                                dynamicChanges[spInternalName] = finalValue;
                            } else {
                                console.warn(`Could not find internal name for display name '${spDisplayName}' while applying changes. Skipping this field.`);
                            }
                        }
                    }
                    if (Object.keys(dynamicChanges).length > 0) {
                        await graphClient.api(`/sites/${siteId}/lists/${controlsListId}/items/${controlItemSpId}/fields`).patch(dynamicChanges);
                    }
                }
            } else if (requestToUpdate.requestType === 'Criação') {
                const fieldsForNewControl: {[key: string]: any} = {};
                for(const [key, value] of Object.entries(requestToUpdate.changes)) {
                    const displayName = (appToSpDisplayNameMapping as any)[key];
                    if (displayName) {
                        fieldsForNewControl[displayName] = value;
                    }
                }
                fieldsForNewControl['Status'] = 'Ativo';
                await addSoxControl(fieldsForNewControl);
            }
        } catch (error: any) {
            console.error("Erro no PASSO 2 (Aplicar Mudanças na Matriz):", JSON.stringify(error, null, 2));
            let detailedMessage = "O status da solicitação foi atualizado, mas ocorreu um erro ao aplicar as mudanças na matriz principal (PASSO 2).";
            
            if (error.body) {
                try {
                    const errorBody = JSON.parse(error.body);
                    if (errorBody.error.message) {
                        detailedMessage += ` SharePoint Error: ${errorBody.error.message}`;
                    } else {
                        detailedMessage += ` SharePoint returned an error body: ${error.body}`;
                    }
                } catch (parseError) {
                    detailedMessage += ` Invalid request to SharePoint. Raw response: ${error.body}`;
                }
            } else if (error.message) {
                detailedMessage += ` Details: ${error.message}`;
            }
            
            if (error.statusCode) {
                detailedMessage += ` (Status code: ${error.statusCode})`;
            }
            throw new Error(detailedMessage);
        }
    }
    
    return { ...requestToUpdate, status: newStatus };
};


// --- Mocked Services (for user management etc.) ---
export const getUsers = async (): Promise<MockUser[]> => JSON.parse(JSON.stringify(mockUsers));
export const getNotifications = async (userId: string): Promise<Notification[]> => JSON.parse(JSON.stringify(mockNotifications.filter(n => n.userId === userId)));
export const getVersionHistory = async (): Promise<VersionHistoryEntry[]> => JSON.parse(JSON.stringify(mockVersionHistory));
export const addUser = async (userData: {name: string, email: string}): Promise<MockUser> => {
    const newUser: MockUser = { id: `user-new-${Date.now()}`, ...userData, password: 'DefaultPassword123', roles: ['control-owner'], activeProfile: 'Dono do Controle' };
    mockUsers.push(newUser);
    return JSON.parse(JSON.stringify(newUser));
}
export const updateUserRolesAndProfile = async (userId: string, roles: string[], activeProfile: UserProfileType): Promise<MockUser | null> => {
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if(userIndex > -1) {
        mockUsers[userIndex].roles = roles;
        mockUsers[userIndex].activeProfile = activeProfile;
        return JSON.parse(JSON.stringify(mockUsers[userIndex]));
    }
    return null;
}
export const deleteUser = async (userId: string): Promise<boolean> => {
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex > -1) {
        mockUsers.splice(userIndex, 1);
        return true;
    }
    return false;
}
export const getTenantUsers = async (searchQuery: string): Promise<TenantUser[]> => {
  if (!searchQuery || searchQuery.trim().length < 3) return [];
  const graphClient = await getGraphClient();
  const filterString = `(startsWith(displayName, '${searchQuery}') or startsWith(mail, '${searchQuery}')) and accountEnabled eq true`;
  const response = await graphClient.api('/users').header('ConsistencyLevel', 'eventual').count(true).filter(filterString).top(25).select('id,displayName,mail,userPrincipalName').get();
  return response.value.map((user: any) => ({ id: user.id, name: user.displayName, email: user.mail || user.userPrincipalName }));
};


    

    







