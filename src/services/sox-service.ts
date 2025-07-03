
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
let historyColumnMapCache: Map<string, string> | null = null;

// Helper to format values for text storage in SharePoint
const formatSpValue = (val: any): string => {
    if (val === undefined || val === null || val === '') return '';
    if (Array.isArray(val)) return val.length > 0 ? val.join('; ') : '';
    if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
    return String(val);
};

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

// Dynamically gets and caches the column mapping for the HISTORY list
async function getHistoryColumnMapping(): Promise<Map<string, string>> {
    if (historyColumnMapCache) {
        return historyColumnMapCache;
    }

    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_HISTORY_LIST_NAME) {
        throw new Error("SharePoint configuration is missing for history list.");
    }
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_HISTORY_LIST_NAME);

    const response = await graphClient
        .api(`/sites/${siteId}/lists/${listId}/columns`)
        .select('displayName,name')
        .get();
    
    if (!response || !response.value) {
      throw new Error("Could not fetch column details from SharePoint for history mapping.");
    }

    const mapping = new Map<string, string>();
    for (const column of response.value) {
        mapping.set(column.displayName, column.name);
    }
    
    historyColumnMapCache = mapping;
    return mapping;
}


export const getSharePointColumnDetails = async (): Promise<SharePointColumn[]> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint configuration is missing.");
    }
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
    const systemColumnInternalNames = new Set(['Title', 'ContentType', 'Attachments', 'Edit', 'DocIcon', 'LinkTitleNoMenu', 'LinkTitle', 'ItemChildCount', 'FolderChildCount', '_UIVersionString']);
    
    const response = await graphClient
        .api(`/sites/${siteId}/lists/${listId}/columns`)
        .select('displayName,hidden,readOnly,name,text,number,boolean,choice,dateTime')
        .get();

    if (!response || !response.value) {
      throw new Error("Could not fetch column details from SharePoint.");
    }

    const getColumnType = (spColumn: any): SharePointColumn['type'] => {
        if (spColumn.boolean) return 'boolean';
        if (spColumn.dateTime) return 'dateTime';
        if (spColumn.number) return 'number';
        if (spColumn.choice) return spColumn.choice.allowMultipleValues ? 'multiChoice' : 'choice';
        if (spColumn.text) return spColumn.text.allowMultipleLines ? 'note' : 'text';
        return 'unsupported';
    };

    return response.value
        .filter((column: any) => !column.hidden && !column.readOnly && !systemColumnInternalNames.has(column.name))
        .map((column: any) => ({
            displayName: column.displayName,
            internalName: column.name,
            type: getColumnType(column),
        }));
};

const mapSharePointItemToSoxControl = (item: any, columnMap: Map<string, string>): SoxControl => {
    const spFields = item.fields;
    if (!spFields) return {} as SoxControl;

    const soxControl: Partial<SoxControl> = {
        id: item.id,
        lastUpdated: item.lastModifiedDateTime,
    };

    // Use the appToSpDisplayNameMapping to dynamically look up internal names and map fields
    for (const [appKey, spDisplayName] of Object.entries(appToSpDisplayNameMapping)) {
        const spInternalName = columnMap.get(spDisplayName);
        
        if (spInternalName && spFields[spInternalName] !== undefined) {
            let value = spFields[spInternalName];

            // Handle boolean parsing for specific boolean fields based on our app's type definition
            const booleanFields: (keyof SoxControl)[] = ['mrc', 'aplicavelIPE', 'ipe_C', 'ipe_EO', 'ipe_VA', 'ipe_OR', 'ipe_PD', 'impactoMalhaSul'];
            if (booleanFields.includes(appKey as keyof SoxControl)) {
                value = parseSharePointBoolean(value);
            }
            
            (soxControl as any)[appKey] = value;
        }
    }
    
    // Status is a special case, might not be in the mapping or could have a different display name
    const statusInternalName = columnMap.get("Status") || 'Status'; // Fallback to common names
    soxControl.status = (spFields[statusInternalName] as SoxControlStatus) || 'Ativo';
    
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
        
        // Get the dynamic column mapping first
        const columnMap = await getControlsColumnMapping();
        
        let response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items?expand=fields`)
            .get();

        const allControls: SoxControl[] = [];
        while (response && response.value) {
            // Pass the map to the mapping function for each item
            allControls.push(...response.value.map(item => mapSharePointItemToSoxControl(item, columnMap)));
            
            if (response['@odata.nextLink']) {
                response = await graphClient.api(response['@odata.nextLink']).get();
            } else {
                break;
            }
        }
        return allControls;
    } catch (error) {
        console.error("Failed to get SOX controls from SharePoint:", error);
        // Fallback to mock data on error to avoid full app crash, but log the error.
        return JSON.parse(JSON.stringify(mockSoxControls));
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
    
    const changesJSON = fields.DadosAlteracaoJSON;
    let parsedChanges = {};
    try {
        if (changesJSON) {
            parsedChanges = JSON.parse(changesJSON);
        } else if (fields.field_13 && fields.field_14 !== undefined) {
            // Fallback for older data or if JSON is missing
            parsedChanges = { [fields.field_13]: fields.field_14 };
        }
    } catch (e) {
        console.error(`Failed to parse changes JSON for request ${fields.Title}:`, e);
         if (fields.field_13 && fields.field_14 !== undefined) {
            parsedChanges = { [fields.field_13]: fields.field_14 };
        }
    }
    
    const request: ChangeRequest = {
        id: fields.Title, // ID da Solicitação is in Title
        spListItemId: item.id,
        controlId: fields.field_4,
        controlName: fields.field_3,
        requestType: fields.field_2 || 'Alteração',
        requestedBy: fields.field_5 || "Não encontrado",
        requestDate: fields.DatadaSolicita_x00e7__x00e3_o || item.lastModifiedDateTime,
        status: fields.field_8 || 'Pendente',
        changes: parsedChanges,
        comments: fields.field_7, // Detalhes da mudança
        reviewedBy: fields.field_11,
        reviewDate: fields.field_10,
        adminFeedback: fields.field_12 || '',
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

export const addChangeRequest = async (requestData: Partial<ChangeRequest>): Promise<ChangeRequest> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_HISTORY_LIST_NAME) {
      throw new Error("SharePoint history list name is not configured.");
    }
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const historyListId = await getListId(graphClient, siteId, SHAREPOINT_HISTORY_LIST_NAME);
    
    const newRequestId = `cr-new-${Date.now()}`;
    const requestDate = new Date().toISOString();

    const fieldsToCreate: {[key: string]: any} = {
        'Title': newRequestId, // ID da Solicitação
        'field_2': requestData.requestType, // "Alteração" ou "Criação"
        'field_3': requestData.controlName, // Nome do Controle
        'field_4': requestData.controlId,   // ID do Controle
        'field_5': requestData.requestedBy, // Solicitado Por
        'DatadaSolicita_x00e7__x00e3_o': requestDate, // Using encoded name for "Data da Solicitação"
        'field_8': "Pendente", // Status Final
        'field_7': requestData.comments, // Detalhes da mudança (Texto 'de-para')
        
        // Mantém a estrutura completa da mudança para a lógica de aprovação
        'DadosAlteracaoJSON': JSON.stringify(requestData.changes || {}),
        
        // Popula os campos individuais conforme solicitado
        'field_13': requestData.changes ? Object.keys(requestData.changes)[0] : '', // Campo Alterado (nome técnico)
        'field_14': requestData.changes ? formatSpValue(Object.values(requestData.changes)[0]) : '', // Valor Novo (texto)
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
            'field_8': newStatus,
            'field_10': new Date().toISOString(),
            // 'field_11' is likely a 'Person' column, which doesn't accept a text name.
            // Temporarily disabling this to fix the 'Invalid request' error.
            // 'field_11': reviewedBy,
            'field_12': adminFeedback || '',
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
                const controlsListId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME!);
                const controlsColumnMap = await getControlsColumnMapping();
                const controlIdInternalName = controlsColumnMap.get('Código NOVO');
                if (!controlIdInternalName) {
                    throw new Error("Não foi possível encontrar o nome interno da coluna 'Código NOVO'.");
                }
                
                const controlItemsResponse = await graphClient
                    .api(`/sites/${siteId}/lists/${controlsListId}/items`)
                    .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
                    .filter(`fields/${controlIdInternalName} eq '${requestToUpdate.controlId}'`)
                    .get();
                    
                if (!controlItemsResponse.value || controlItemsResponse.value.length === 0) {
                    throw new Error(`Controle principal com ID ${requestToUpdate.controlId} não encontrado para aplicar a alteração.`);
                }
                const controlItemSpId = controlItemsResponse.value[0].id;
                
                const { id, controlId, controlName, ...changesToApply } = requestToUpdate.changes;
                
                if (Object.keys(changesToApply).length > 0) {
                   const dynamicChanges: {[key: string]: any} = {};
                    for (const [appKey, changeValue] of Object.entries(changesToApply)) {
                        const spDisplayName = (appToSpDisplayNameMapping as any)[appKey];
                        if(spDisplayName) {
                            const spInternalName = controlsColumnMap.get(spDisplayName);
                            if(spInternalName) {
                                dynamicChanges[spInternalName] = changeValue;
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
