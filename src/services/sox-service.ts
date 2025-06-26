
// src/services/sox-service.ts
'use server';

import { getGraphClient, getSiteId, getListId } from './sharepoint-client';
import type { SoxControl, ChangeRequest, MockUser, Notification, VersionHistoryEntry, UserProfileType, SoxControlStatus, SharePointColumn, TenantUser } from '@/types';
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
const SHAREPOINT_HISTORY_LIST_NAME = 'Histórico-Solicitações-MatrizSOX';

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
const buildColumnMappings = async (listName: string): Promise<Map<string, ColumnMapping>> => {
    if (!SHAREPOINT_SITE_URL) {
        throw new Error("SharePoint configuration is missing.");
    }
    try {
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const listId = await getListId(graphClient, siteId, listName);

        const response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/columns`)
            .get();

        if (!response || !response.value) {
            throw new Error(`Could not fetch column definitions from SharePoint for list '${listName}'.`);
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
        console.error(`FATAL: Failed to build dynamic SharePoint mappings for list '${listName}'.`, error);
        throw new Error(`Could not initialize connection with SharePoint list schema for '${listName}'.`);
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
     // START MOCK-ONLY RETURN
    if (process.env.USE_MOCK_DATA === 'true') {
        return JSON.parse(JSON.stringify(mockSoxControls));
    }
    // END MOCK-ONLY RETURN

    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint site URL or list name is not configured.");
    }
    
    try {
        const columnMap = await buildColumnMappings(SHAREPOINT_CONTROLS_LIST_NAME);
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
        
        const allControls: SoxControl[] = [];
        let response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items?expand=fields`)
            .get();

        while (response) {
            if (response.value) {
                const controlsFromPage = response.value.map((item: any) => mapSharePointItemToSoxControl(item, columnMap));
                allControls.push(...controlsFromPage);
            }
            if (response['@odata.nextLink']) {
                response = await graphClient.api(response['@odata.nextLink']).get();
            } else {
                break;
            }
        }
        return allControls;

    } catch (error) {
        console.error("Failed to get SOX controls from SharePoint:", error);
        // Fallback to mock data on SharePoint error
        return JSON.parse(JSON.stringify(mockSoxControls));
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

    const columnMap = await buildColumnMappings(SHAREPOINT_CONTROLS_LIST_NAME);
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
  
    const fieldsToCreate: { [key: string]: any } = {};
    
    for (const header of Object.keys(rowData)) {
        const mapping = columnMap.get(header.trim());

        if (mapping) {
            const rawValue = rowData[header];
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
        const columnMap = await buildColumnMappings(SHAREPOINT_CONTROLS_LIST_NAME);
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
        const systemColumnInternalNames = new Set(['Title', 'ContentType', 'Attachments', 'Edit', 'DocIcon', 'LinkTitleNoMenu', 'LinkTitle', 'ItemChildCount', 'FolderChildCount', '_UIVersionString']);
        const allColumns: SharePointColumn[] = [];
        
        let response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/columns`)
            .select('displayName,hidden,readOnly,name,text,number,boolean,choice,dateTime')
            .get();

        while (response) {
            if (response.value) {
                const columnsFromPage = response.value
                    .filter((column: any) => !column.hidden && !column.readOnly && !systemColumnInternalNames.has(column.name))
                    .map((column: any) => ({
                        displayName: column.displayName,
                        internalName: column.name,
                        type: getColumnType(column),
                    }));
                allColumns.push(...columnsFromPage);
            }
            if (response['@odata.nextLink']) {
                response = await graphClient.api(response['@odata.nextLink']).get();
            } else {
                break;
            }
        }
        
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
 * Fetches active users from the Azure AD tenant based on a search query.
 */
export const getTenantUsers = async (searchQuery: string): Promise<TenantUser[]> => {
  if (!searchQuery || searchQuery.trim().length < 3) {
    return [];
  }
  
  try {
    const graphClient = await getGraphClient();
    
    const filterConditions = [
        `(startsWith(displayName, '${searchQuery}') or startsWith(mail, '${searchQuery}'))`,
        `(endsWith(userPrincipalName, '@rumolog.com') or endsWith(userPrincipalName, '@ext.rumolog.com'))`,
        `accountEnabled eq true`
    ];
    const filterString = filterConditions.join(' and ');
    
    const response = await graphClient
      .api('/users')
      .header('ConsistencyLevel', 'eventual') 
      .count(true) 
      .filter(filterString)
      .top(25) 
      .select('id,displayName,mail,userPrincipalName')
      .get();
    
    if (response.value) {
        return response.value.map((user: any) => ({
            id: user.id,
            name: user.displayName,
            email: user.mail || user.userPrincipalName,
        }));
    }
    return [];

  } catch (error) {
    console.error("Failed to fetch tenant users from Graph API:", error);
    throw new Error("Could not retrieve users from the directory.");
  }
};


// --- Change Request Services (SharePoint-driven) ---

/**
 * Maps a SharePoint history list item to a ChangeRequest object.
 * @param item The SharePoint list item.
 * @returns A ChangeRequest object.
 */
const mapHistoryItemToChangeRequest = (item: any): ChangeRequest => {
    const fields = item.fields;
    let changes = {};
    try {
        if (fields.DadosAlteracaoJSON) {
            changes = JSON.parse(fields.DadosAlteracaoJSON);
        }
    } catch (e) {
        console.warn(`Could not parse DadosAlteracaoJSON for request ${fields.IDdaSolicitacao}:`, e);
    }

    return {
        id: fields.IDdaSolicitacao || item.id,
        spListItemId: item.id, // Store the SharePoint list item ID
        controlId: fields.IDControle,
        controlName: fields.NomeControle,
        requestType: fields.Tipo,
        requestedBy: fields.SolicitadoPor,
        requestDate: fields.DataSolicitacao || item.createdDateTime,
        status: fields.StatusFinal || 'Pendente',
        changes: changes,
        comments: fields.DetalhesDaMudanca,
        reviewedBy: fields.RevisadoPor,
        reviewDate: fields.DataRevisao,
        adminFeedback: fields.FeedbackAdmin,
    };
};

/**
 * Fetches all change requests from the SharePoint history list.
 */
export const getChangeRequests = async (): Promise<ChangeRequest[]> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_HISTORY_LIST_NAME) {
        throw new Error("SharePoint site URL or history list name is not configured.");
    }
    try {
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const historyListId = await getListId(graphClient, siteId, SHAREPOINT_HISTORY_LIST_NAME);

        const allRequests: ChangeRequest[] = [];
        let response = await graphClient
            .api(`/sites/${siteId}/lists/${historyListId}/items?expand=fields&orderby=fields/DataSolicitacao desc`)
            .get();

        while (response) {
            if (response.value) {
                const requestsFromPage = response.value.map(mapHistoryItemToChangeRequest);
                allRequests.push(...requestsFromPage);
            }
            if (response['@odata.nextLink']) {
                response = await graphClient.api(response['@odata.nextLink']).get();
            } else {
                break;
            }
        }
        return allRequests;
    } catch (error: any) {
        const errorMessage = (error.body || error.message || '').toString().toLowerCase();
        // If the list is not found, it's not a fatal error for loading the page.
        // We can just return an empty array and let the developer know via console.
        if (errorMessage.includes('not found') || errorMessage.includes('não encontrada')) {
             console.warn(`SharePoint history list '${SHAREPOINT_HISTORY_LIST_NAME}' not found. Returning empty change requests. Please ensure the list is created correctly.`);
             return [];
        }
        console.error("Failed to get Change Requests from SharePoint:", error.body || error);
        throw new Error("Could not retrieve change requests from SharePoint.");
    }
};

/**
 * Adds a new change request to the SharePoint history list.
 */
export const addChangeRequest = async (requestData: Partial<ChangeRequest>): Promise<ChangeRequest> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_HISTORY_LIST_NAME) {
      throw new Error("SharePoint site URL or history list name is not configured.");
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
        DetalhesDaMudanca: requestData.comments,
        StatusFinal: "Pendente",
        DadosAlteracaoJSON: JSON.stringify(requestData.changes || {}),
    };

    const newItem = { fields: fieldsToCreate };

    try {
        const response = await graphClient
            .api(`/sites/${siteId}/lists/${historyListId}/items`)
            .post(newItem);
        
        return {
            ...requestData,
            id: newRequestId,
            spListItemId: response.id,
            requestDate: requestDate,
            status: 'Pendente',
        } as ChangeRequest;

    } catch (error: any) {
        console.error("Failed to add change request to SharePoint:", error.body || error);
        throw new Error("Could not create change request in SharePoint.");
    }
};

/**
 * Updates the status of a change request in SharePoint and applies changes if approved.
 */
export const updateChangeRequestStatus = async (
  requestId: string,
  newStatus: 'Aprovado' | 'Rejeitado',
  reviewedBy: string
): Promise<ChangeRequest> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_HISTORY_LIST_NAME || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint configuration is missing.");
    }
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const historyListId = await getListId(graphClient, siteId, SHAREPOINT_HISTORY_LIST_NAME);

    // 1. Find the history item to update using its request ID
    const historyItemsResponse = await graphClient
        .api(`/sites/${siteId}/lists/${historyListId}/items`)
        .filter(`fields/IDdaSolicitacao eq '${requestId}'`)
        .expand('fields')
        .get();

    if (!historyItemsResponse.value || historyItemsResponse.value.length === 0) {
        throw new Error(`Solicitação com ID ${requestId} não encontrada no SharePoint.`);
    }
    const historyItem = historyItemsResponse.value[0];
    const historyItemSpId = historyItem.id;
    const originalRequest = mapHistoryItemToChangeRequest(historyItem);
    
    // 2. Update the status of the history item
    const reviewDate = new Date().toISOString();
    const fieldsToUpdateHistory = {
        StatusFinal: newStatus,
        RevisadoPor: reviewedBy,
        DataRevisao: reviewDate,
    };

    await graphClient
        .api(`/sites/${siteId}/lists/${historyListId}/items/${historyItemSpId}/fields`)
        .patch(fieldsToUpdateHistory);

    // 3. If approved, apply the changes to the main controls list
    if (newStatus === 'Aprovado') {
        if (originalRequest.requestType === 'Criação') {
            const changesWithDisplayNames: { [key: string]: any } = {};
            for (const [appKey, value] of Object.entries(originalRequest.changes)) {
                const displayName = (appToSpDisplayNameMapping as any)[appKey];
                if (displayName) {
                    changesWithDisplayNames[displayName] = value;
                } else {
                     changesWithDisplayNames[appKey] = value; // Fallback
                }
            }
            await addSoxControl(changesWithDisplayNames);
        } else { // It's an 'Alteração'
            const controlsListId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
            const columnMap = await buildColumnMappings(SHAREPOINT_CONTROLS_LIST_NAME);

            const controlItemsResponse = await graphClient
                .api(`/sites/${siteId}/lists/${controlsListId}/items`)
                .filter(`fields/${columnMap.get('Código NOVO')?.internalName} eq '${originalRequest.controlId}'`)
                .get();
            
            if (!controlItemsResponse.value || controlItemsResponse.value.length === 0) {
                throw new Error(`Controle principal com ID ${originalRequest.controlId} não encontrado para aplicar a alteração.`);
            }
            const controlItemSpId = controlItemsResponse.value[0].id;

            const fieldsToUpdateControl: { [key: string]: any } = {};
            const appKeyToSpInternalName = Object.entries(appToSpDisplayNameMapping)
                .reduce((acc, [appKey, spName]) => {
                    const mapping = columnMap.get(spName);
                    if (mapping) { (acc as any)[appKey] = mapping.internalName; }
                    return acc;
                }, {} as Record<string, string>);

            for (const [key, value] of Object.entries(originalRequest.changes)) {
                const spInternalName = appKeyToSpInternalName[key];
                if (spInternalName) { fieldsToUpdateControl[spInternalName] = value; }
            }
            
            if (Object.keys(fieldsToUpdateControl).length > 0) {
                await graphClient
                    .api(`/sites/${siteId}/lists/${controlsListId}/items/${controlItemSpId}/fields`)
                    .patch(fieldsToUpdateControl);
            }
        }
    }
    
    // Return the updated request object to the UI
    originalRequest.status = newStatus;
    originalRequest.reviewedBy = reviewedBy;
    originalRequest.reviewDate = reviewDate;
    return originalRequest;
};


// --- Mocked Services (for user management etc.) ---

export const getUsers = async (): Promise<MockUser[]> => JSON.parse(JSON.stringify(mockUsers));
export const getNotifications = async (userId: string): Promise<Notification[]> => JSON.parse(JSON.stringify(mockNotifications.filter(n => n.userId === userId)));
export const getVersionHistory = async (): Promise<VersionHistoryEntry[]> => JSON.parse(JSON.stringify(mockVersionHistory));

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
