// src/services/sox-service.ts
'use server';

import { getGraphClient, getSiteId, getListId } from './sharepoint-client';
import type { SoxControl, ChangeRequest, SharePointColumn, TenantUser, ChangeRequestStatus, SoxControlStatus } from '@/types';
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

    const spDisplayNameToAppKeyMap = Object.entries(appToSpDisplayNameMapping).reduce((acc, [appKey, spName]) => {
        (acc as any)[spName] = appKey as keyof SoxControl;
        return acc;
    }, {} as Record<string, keyof SoxControl>);

    const soxControl: Partial<SoxControl> = {
        id: item.id,
        spListItemId: item.id,
        lastUpdated: spFields.lastModifiedDateTime || spFields.Modified,
    };
    
    const booleanAppKeys = new Set(['mrc', 'aplicavelIPE', 'ipe_C', 'ipe_EO', 'ipe_VA', 'ipe_OR', 'ipe_PD', 'impactoMalhaSul']);

    for (const column of columnDetails) {
        const { displayName, internalName } = column;
        
        const appKeyFromMap = spDisplayNameToAppKeyMap[displayName];
        const finalAppKey = appKeyFromMap || displayName.replace(/\s+/g, '');

        if (spFields[internalName] !== undefined && spFields[internalName] !== null) {
            let value = spFields[internalName];

            if (appKeyFromMap && booleanAppKeys.has(appKeyFromMap)) {
                value = parseSharePointBoolean(value);
            } 
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
            else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
                if ('lookupValue' in value) value = value.lookupValue;
                else if ('DisplayName' in value) value = value.DisplayName;
                else if ('Title' in value) value = value.Title;
            }
            
            (soxControl as any)[finalAppKey] = value;
        }
    }
    
    if (spFields.Status) {
        soxControl.status = spFields.Status as SoxControlStatus;
    } else {
        soxControl.status = 'Ativo';
    }

    return soxControl as SoxControl;
};

export const getSoxControls = async (): Promise<SoxControl[]> => {
    if (process.env.USE_MOCK_DATA === 'true') {
        // Mocks are no longer the source of truth for dynamic data
        return [];
    }
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint site URL or list name is not configured.");
    }
    try {
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
        
        const columnDetails = await getSharePointColumnDetails();
        
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
        
        const allControls = allItems.map(item => mapSharePointItemToSoxControl(item, columnDetails));
        
        return allControls;

    } catch (error: any) {
        console.error("Failed to get SOX controls from SharePoint:", error);
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

        const spDisplayName = (appToSpDisplayNameMapping as any)[appKey];
        if (!spDisplayName) {
            console.warn(`No SharePoint display name mapping found for app key '${appKey}'. Attempting to update using app key directly.`);
        }

        const spInternalName = columnMap.get(spDisplayName);
        if (!spInternalName) {
            throw new Error(`Could not find SharePoint internal column name for '${spDisplayName || appKey}'. The column may not exist or is not accessible.`);
        }

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
  
    const newItem = { fields: { ...fieldsToCreate, Status: 'Ativo' } };
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

    const changes = {};
    if (fields.Campoajustado && fields.Descricaocampo) {
        try {
            (changes as any)[fields.Campoajustado] = JSON.parse(fields.Descricaocampo);
        } catch(e) {
            (changes as any)[fields.Campoajustado] = fields.Descricaocampo;
        }
    }
    
    const request: ChangeRequest = {
        id: fields.Title,
        spListItemId: item.id,
        controlId: fields.field_4, 
        controlName: fields.field_3, 
        requestType: fields.field_2 || 'Alteração', 
        requestedBy: fields.field_5 || "Não encontrado", 
        requestDate: fields.field_6 || item.lastModifiedDateTime,
        status: fields.field_8 || 'Pendente',
        comments: fields.field_7 || 'Nenhum detalhe fornecido.',
        changes: changes,
        fieldName: fields.Campoajustado,
        newValue: fields.Descricaocampo, // Keep it as string, parse later
        reviewedBy: fields.field_10,
        reviewDate: fields.field_11,
        adminFeedback: fields.field_12 || '',
    };

    try {
        if(request.newValue) {
            request.newValue = JSON.parse(request.newValue)
        }
    } catch (e) {
      // It's just a plain string, that's fine.
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

    const fieldsToCreate: {[key:string]: any} = {
        'Title': newRequestId,
        'field_2': requestData.requestType,
        'field_3': requestData.controlName,
        'field_4': requestData.controlId,
        'field_5': requestData.requestedBy,
        'field_6': requestDate,
        'field_7': requestData.comments,
        'Campoajustado': requestData.fieldName,
        'Descricaocampo': JSON.stringify(requestData.newValue),
        'field_8': "Pendente",
    };
    
    const response = await graphClient.api(`/sites/${siteId}/lists/${historyListId}/items`).post({ fields: fieldsToCreate });

    const changes = requestData.fieldName ? { [requestData.fieldName]: requestData.newValue } : {};
    
    return { 
        ...requestData, 
        id: newRequestId, 
        spListItemId: response.id, 
        requestDate, 
        status: 'Pendente',
        changes
    } as ChangeRequest;
};

export const updateChangeRequestStatus = async (
  requestId: string,
  newStatus: ChangeRequestStatus,
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
    
    try {
        const historyListId = await getListId(graphClient, siteId, SHAREPOINT_HISTORY_LIST_NAME!);
        
        const fieldsForHistoryUpdate: { [key: string]: any } = {
            'field_8': newStatus,
            'field_10': reviewedBy,
            'field_11': new Date().toISOString(),
            'field_12': adminFeedback || '',
        };
        
        await graphClient.api(`/sites/${siteId}/lists/${historyListId}/items/${requestToUpdate.spListItemId}/fields`).patch(fieldsForHistoryUpdate);
    } catch (error: any) {
        console.error("Erro ao atualizar o status da solicitação:", JSON.stringify(error, null, 2));
        let detailedMessage = `Ocorreu um erro ao atualizar o status da solicitação. SharePoint Error: ${error.message}`;
        if (error.body) {
            try {
                const errorBody = JSON.parse(error.body);
                if (errorBody.error?.message) {
                    detailedMessage = `SharePoint Error: ${errorBody.error.message}`;
                }
            } catch (e) { /* ignore parse error */ }
        }
        throw new Error(detailedMessage);
    }

    if (newStatus === 'Aprovado' && requestToUpdate.requestType === 'Alteração') {
        try {
            const allControls = await getSoxControls();
            const controlToUpdate = allControls.find(c => c.controlId === requestToUpdate.controlId);
                
            if (!controlToUpdate || !controlToUpdate.id) {
                throw new Error(`Controle principal com Código NOVO '${requestToUpdate.controlId}' não encontrado na matriz para aplicar a alteração.`);
            }
            
            const controlItemSpId = controlToUpdate.id;
            
            const fieldNameFromRequest = requestToUpdate.fieldName;
            const newValueFromRequest = requestToUpdate.newValue;

            if (fieldNameFromRequest) {
                await updateSoxControlField(controlItemSpId, { appKey: fieldNameFromRequest as keyof SoxControl, value: newValueFromRequest });
            } else {
                 throw new Error("Não foi possível aplicar a alteração: o nome do campo a ser modificado não foi encontrado na solicitação.");
            }

        } catch (error: any) {
            let detailedMessage = "O status foi atualizado, mas ocorreu um erro ao aplicar as mudanças na matriz principal.";
            if (error.body) {
                try {
                    const errorBody = JSON.parse(error.body);
                    if (errorBody.error.message) {
                        detailedMessage += ` SharePoint Error: ${errorBody.error.message}`;
                    }
                } catch (parseError) {}
            } else if (error.message) {
                detailedMessage += ` Detalhes: ${error.message}`;
            }
            throw new Error(detailedMessage);
        }
    } else if (newStatus === 'Ciente' && requestToUpdate.requestType === 'Criação') {
        try {
            if (!requestToUpdate.controlName) {
                throw new Error("O nome do controle proposto não foi encontrado na solicitação de criação.");
            }
            
            // This logic was flawed. It was trying to create the control when it should be handled elsewhere.
            // When marking as "Ciente", we just update the status. The admin will create the control manually.
            // This block is now intentionally left empty as per user request.

        } catch (error: any) {
             throw new Error(`O status foi atualizado para Ciente, mas ocorreu um erro. Detalhes: ${error.message}`);
        }
    }
    
    return { ...requestToUpdate, status: newStatus };
};

export const getHistoryListColumns = async (): Promise<SharePointColumn[]> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_HISTORY_LIST_NAME) {
        throw new Error("SharePoint configuration is missing for history list.");
    }
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_HISTORY_LIST_NAME);
    
    const response = await graphClient
        .api(`/sites/${siteId}/lists/${listId}/columns`)
        .get();

    if (!response || !response.value) {
      throw new Error("Could not fetch column details from SharePoint history list.");
    }

    const getColumnType = (spColumn: any): SharePointColumn['type'] => {
        if (spColumn.boolean) return 'boolean';
        if (spColumn.dateTime) return 'dateTime';
        if (spColumn.number) return 'number';
        if (spColumn.choice) return spColumn.choice.allowMultipleValues ? 'multiChoice' : 'choice';
        if (spColumn.text) return spColumn.text.allowMultipleLines ? 'note' : 'text';
        if (spColumn.lookup) return 'text';
        if (spColumn.personOrGroup) return 'text';
        return 'unsupported';
    };

    return response.value
        .filter((column: any) => !column.hidden)
        .map((column: any) => ({
            displayName: column.displayName,
            internalName: column.name,
            type: getColumnType(column),
        }));
};


// --- Service for Tenant User search ---
export const getTenantUsers = async (searchQuery: string): Promise<TenantUser[]> => {
  if (!searchQuery || searchQuery.trim().length < 3) return [];
  const graphClient = await getGraphClient();
  const filterString = `(startsWith(displayName, '${searchQuery}') or startsWith(mail, '${searchQuery}')) and accountEnabled eq true`;
  const response = await graphClient.api('/users').header('ConsistencyLevel', 'eventual').count(true).filter(filterString).top(25).select('id,displayName,mail,userPrincipalName').get();
  return response.value.map((user: any) => ({ id: user.id, name: user.displayName, email: user.mail || user.userPrincipalName }));
};
