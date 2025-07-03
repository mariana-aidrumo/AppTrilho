
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

const mapHistoryItemToChangeRequest = (item: any, columnMap: Map<string, string>): ChangeRequest | null => {
    const fields = item.fields;
    if (!fields) return null;

    // Helper to read fields flexibly by trying multiple common display names
    const getField = (displayNames: string[]) => {
        for (const displayName of displayNames) {
            const internalName = columnMap.get(displayName);
            if (internalName && fields.hasOwnProperty(internalName)) {
                return fields[internalName];
            }
        }
        return undefined;
    };
    
    // Specifically handle lookup fields which return an object
    const getLookupFieldValue = (fieldValue: any): string => {
        if (Array.isArray(fieldValue) && fieldValue.length > 0 && fieldValue[0].lookupValue) {
            return fieldValue[0].lookupValue;
        }
        if (typeof fieldValue === 'object' && fieldValue !== null && fieldValue.Title) {
            return fieldValue.Title;
        }
        if (typeof fieldValue === 'string') {
            return fieldValue;
        }
        return '';
    };

    const idDaSolicitacao = getField(["ID da Solicitação", "IDdaSolicitacao", "Title"]);
    
    if (!idDaSolicitacao) {
        console.warn("Skipping history record due to missing core ID:", { id: item.id });
        return null;
    }

    const changesJSON = getField(["DadosAlteracaoJSON"]);
    let parsedChanges = {};
    try {
        if (changesJSON) parsedChanges = JSON.parse(changesJSON);
    } catch (e) {
        console.error(`Failed to parse changes JSON for request ${idDaSolicitacao}:`, e);
    }
    
    const request: ChangeRequest = {
        id: idDaSolicitacao,
        spListItemId: item.id,
        controlId: getField(["ID Controle", "IDControle"]) || "N/A",
        controlName: getField(["Nome do Controle", "NomeControle"]),
        requestType: getField(["Tipo"]) || 'Alteração',
        requestedBy: getLookupFieldValue(getField(["Solicitado Por", "SolicitadoPor"])),
        requestDate: getField(["Data da Solicitação", "Data da Solicitacao"]) || item.lastModifiedDateTime,
        status: fields.field_8 || 'Pendente',
        changes: parsedChanges,
        comments: fields.field_7 || '', // Read directly from field_7
        reviewedBy: getLookupFieldValue(getField(["Revisado Por", "RevisadoPor", "field_11"])),
        reviewDate: getField(["DataRevisao", "Data Revisao", "Data Revisão", "field_10"]),
        adminFeedback: getField(["Feedback do Admin", "Feedback do Administrador"]) || '',
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
        const columnMap = await getHistoryColumnMapping();
        
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
            .map(item => mapHistoryItemToChangeRequest(item, columnMap))
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
    const columnMap = await getHistoryColumnMapping();
    
    const newRequestId = `cr-new-${Date.now()}`;
    const requestDate = new Date().toISOString();

    const fieldsToCreate: {[key: string]: any} = {};
    const setField = (displayName: string, value: any) => {
        const internalName = columnMap.get(displayName);
        if (internalName) fieldsToCreate[internalName] = value;
    };

    setField("ID da Solicitação", newRequestId);
    setField("Title", newRequestId); // Title is often mandatory
    setField("Tipo", requestData.requestType);
    setField("Nome do Controle", requestData.controlName);
    setField("ID Controle", requestData.controlId);
    setField("Solicitado Por", requestData.requestedBy); // This assumes a simple text field for now
    setField("Data da Solicitação", requestDate);
    fieldsToCreate['field_8'] = "Pendente"; // Set status to 'Pendente' using internal name
    setField("DadosAlteracaoJSON", JSON.stringify(requestData.changes || {}));
    fieldsToCreate['field_7'] = requestData.comments; // Set comments using internal name
    
    const response = await graphClient.api(`/sites/${siteId}/lists/${historyListId}/items`).post({ fields: fieldsToCreate });
    return { ...requestData, id: newRequestId, spListItemId: response.id, requestDate, status: 'Pendente' } as ChangeRequest;
};

export const updateChangeRequestStatus = async (
  requestId: string,
  newStatus: 'Aprovado' | 'Rejeitado',
  reviewedBy: string,
  adminFeedback?: string
): Promise<ChangeRequest> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_HISTORY_LIST_NAME || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint configuration is missing.");
    }

    const allRequests = await getChangeRequests();
    const requestToUpdate = allRequests.find(req => req.id === requestId);

    if (!requestToUpdate || !requestToUpdate.spListItemId) {
       throw new Error(`Solicitação com ID ${requestId} não encontrada ou não possui um ID de item do SharePoint.`);
    }

    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const historyListId = await getListId(graphClient, siteId, SHAREPOINT_HISTORY_LIST_NAME);
    const historyColumnMap = await getHistoryColumnMapping();
    
    const fieldsForHistoryUpdate: {[key: string]: any} = {
        'field_8': newStatus,
        'field_10': new Date().toISOString(),
        'field_11': reviewedBy,
    };
    
    const feedbackInternalName = Array.from(historyColumnMap.entries())
      .find(([displayName]) => displayName.toLowerCase().includes('feedback'))?.[1];

    if (feedbackInternalName && adminFeedback) {
        fieldsForHistoryUpdate[feedbackInternalName] = adminFeedback;
    }
    
    await graphClient.api(`/sites/${siteId}/lists/${historyListId}/items/${requestToUpdate.spListItemId}/fields`).patch(fieldsForHistoryUpdate);

    if (newStatus === 'Aprovado') {
        if (requestToUpdate.requestType === 'Alteração') {
            const controlsListId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
            const controlsColumnMap = await getControlsColumnMapping();
            
            const controlIdInternalName = controlsColumnMap.get('Código NOVO');
            if (!controlIdInternalName) {
                throw new Error("Não foi possível encontrar o nome interno da coluna 'Código NOVO'.");
            }
            
            const controlItemsResponse = await graphClient
                .api(`/sites/${siteId}/lists/${controlsListId}/items`)
                .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
                .filter(`${controlIdInternalName} eq '${requestToUpdate.controlId}'`)
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
                        }
                    }
                }
                 if (Object.keys(dynamicChanges).length > 0) {
                    await graphClient.api(`/sites/${siteId}/lists/${controlsListId}/items/${controlItemSpId}/fields`).patch(dynamicChanges);
                }
            }
        } else if (newStatus === 'Aprovado' && requestToUpdate.requestType === 'Criação') {
            const fieldsForNewControl: {[key: string]: any} = {};
            for(const [key, value] of Object.entries(requestToUpdate.changes)) {
                const displayName = (appToSpDisplayNameMapping as any)[key];
                if (displayName) {
                    fieldsForNewControl[displayName] = value;
                }
            }
            // Ensure new controls are created as 'Active'
            fieldsForNewControl['Status'] = 'Ativo';
            await addSoxControl(fieldsForNewControl);
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
