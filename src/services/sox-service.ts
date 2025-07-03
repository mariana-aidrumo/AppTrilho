
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
    // This function can be improved with a dynamic mapping, but is not part of the current fix.
    // For now, it will likely fail unless the Excel headers match SharePoint internal names.
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
      throw new Error("SharePoint site URL or list name is not configured.");
    }
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
  
    const newItem = { fields: rowData };
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

    let changes = {};
    if (fields.DadosAlteracaoJSON) {
        try { changes = JSON.parse(fields.DadosAlteracaoJSON); } catch (e) { console.error("Failed to parse DadosAlteracaoJSON for item ID:", item.id, e); }
    }
    
    const getTextField = (field: any): string => {
        if (typeof field === 'object' && field !== null && field.Title) {
            return field.Title;
        }
        return field || '';
    };

    const reviewedBy = getTextField(fields.RevisadoPor);
    const reviewDate = fields.DataRevisao;
    
    // Use both explicit "Status Final" and the common internal name
    const statusFinal = fields.StatusFinal || fields.Status_x0020_Final;
    
    let status: ChangeRequestStatus;

    if (!reviewedBy && !reviewDate) {
        status = 'Pendente';
    } else {
        status = statusFinal || 'Aprovado';
    }

    const request: ChangeRequest = {
        id: fields.IDdaSolicitacao || fields.Title,
        spListItemId: item.id,
        controlId: fields.IDControle || '',
        controlName: fields.NomeControle || '',
        requestType: fields.Tipo || 'Alteração',
        requestedBy: getTextField(fields.SolicitadoPor),
        requestDate: fields.DataSolicitacao || item.lastModifiedDateTime,
        status: status,
        changes: changes,
        comments: fields.DetalhesDaMudanca || 'Nenhum detalhe fornecido.',
        reviewedBy: reviewedBy,
        reviewDate: reviewDate,
        adminFeedback: fields.FeedbackAdmin || '',
    };
    
    if (!request.id || !request.controlId) {
        return null;
    }
    
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
            .map(mapHistoryItemToChangeRequest)
            .filter((req): req is ChangeRequest => req !== null);
        
        allRequests.sort((a, b) => {
            const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
            const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
            return dateB - dateA;
        });
        
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
    
    const fieldsToCreate = {
        Title: newRequestId, 
        IDdaSolicitacao: newRequestId,
        Tipo: requestData.requestType,
        NomeControle: requestData.controlName,
        IDControle: requestData.controlId,
        SolicitadoPor: requestData.requestedBy,
        DataSolicitacao: requestDate,
        StatusFinal: "Pendente",
        DadosAlteracaoJSON: JSON.stringify(requestData.changes || {}),
        DetalhesDaMudanca: requestData.comments,
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
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_HISTORY_LIST_NAME || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint configuration is missing.");
    }
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const historyListId = await getListId(graphClient, siteId, SHAREPOINT_HISTORY_LIST_NAME);
    
    const historyItemResponse = await graphClient
      .api(`/sites/${siteId}/lists/${historyListId}/items`)
      .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
      .filter(`fields/IDdaSolicitacao eq '${requestId}'`)
      .expand('fields')
      .get();
      
    if (!historyItemResponse.value || historyItemResponse.value.length === 0) {
       throw new Error(`Solicitação com ID ${requestId} não encontrada no histórico.`);
    }

    const historyItem = historyItemResponse.value[0];
    const originalRequest = mapHistoryItemToChangeRequest(historyItem);
    
    if (!originalRequest) {
        throw new Error(`Solicitação com ID ${requestId} é inválida e não pode ser processada.`);
    }

    const fieldsToUpdateHistory = {
        StatusFinal: newStatus,
        RevisadoPor: reviewedBy,
        DataRevisao: new Date().toISOString(),
        FeedbackAdmin: adminFeedback || '',
    };
    await graphClient.api(`/sites/${siteId}/lists/${historyListId}/items/${historyItem.id}/fields`).patch(fieldsToUpdateHistory);

    if (newStatus === 'Aprovado' && originalRequest.requestType === 'Alteração') {
        const controlsListId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
        const controlItemsResponse = await graphClient
            .api(`/sites/${siteId}/lists/${controlsListId}/items`)
            .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
            .filter(`fields/C_x00f3_digo_x0020_NOVO eq '${originalRequest.controlId}'`)
            .get();
            
        if (!controlItemsResponse.value || controlItemsResponse.value.length === 0) {
            throw new Error(`Controle principal com ID ${originalRequest.controlId} não encontrado para aplicar a alteração.`);
        }
        const controlItemSpId = controlItemsResponse.value[0].id;
        
        const { id, controlId, controlName, ...changesToApply } = originalRequest.changes;
        
        if (Object.keys(changesToApply).length > 0) {
           const dynamicChanges = {};
           const columnMap = await getControlsColumnMapping();
            for (const [appKey, changeValue] of Object.entries(changesToApply)) {
                const spDisplayName = (appToSpDisplayNameMapping as any)[appKey];
                if(spDisplayName) {
                    const spInternalName = columnMap.get(spDisplayName);
                    if(spInternalName) {
                        (dynamicChanges as any)[spInternalName] = changeValue;
                    }
                }
            }
             if (Object.keys(dynamicChanges).length > 0) {
                await graphClient.api(`/sites/${siteId}/lists/${controlsListId}/items/${controlItemSpId}/fields`).patch(dynamicChanges);
            }
        }
    } else if (newStatus === 'Aprovado' && originalRequest.requestType === 'Criação') {
        await addSoxControl(originalRequest.changes);
    }
    
    return { ...originalRequest, ...fieldsToUpdateHistory, status: newStatus };
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
