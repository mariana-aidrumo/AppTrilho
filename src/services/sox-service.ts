
// src/services/sox-service.ts
'use server';

import 'isomorphic-fetch'; // Required polyfill for Microsoft Graph client
import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication, Configuration, LogLevel } from '@azure/msal-node';
import type { SoxControl, ChangeRequest, SharePointColumn, TenantUser, ChangeRequestStatus, SoxControlStatus, MockUser, UserProfileType } from '@/types';
import { parseSharePointBoolean, appToSpDisplayNameMapping } from '@/lib/sharepoint-utils';

// --- SharePoint Client Logic (Consolidated) ---

const {
  SHAREPOINT_TENANT_ID,
  SHAREPOINT_CLIENT_ID,
  SHAREPOINT_CLIENT_SECRET,
  SHAREPOINT_SITE_URL,
} = process.env;

if (!SHAREPOINT_TENANT_ID || !SHAREPOINT_CLIENT_ID || !SHAREPOINT_CLIENT_SECRET || !SHAREPOINT_SITE_URL) {
  // In a real build environment (like Azure), this would fail the build if variables are missing.
  // In a local or GitHub Actions test build, dummy variables are expected.
  console.warn("One or more SharePoint environment variables are not set. This is expected for local/test builds but will fail in production.");
}

const msalConfig: Configuration = {
  auth: {
    clientId: SHAREPOINT_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${SHAREPOINT_TENANT_ID}`,
    clientSecret: SHAREPOINT_CLIENT_SECRET!,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
    },
  },
};

const cca = new ConfidentialClientApplication(msalConfig);
const scopes = ['https://graph.microsoft.com/.default'];

let graphClient: Client | undefined;
const idCache: { siteId?: string; listIds: Map<string, string> } = { listIds: new Map() };

async function getGraphClient(): Promise<Client> {
  if (graphClient) {
    return graphClient;
  }
  
  if (!SHAREPOINT_CLIENT_ID || !SHAREPOINT_CLIENT_SECRET || !SHAREPOINT_TENANT_ID) {
    throw new Error("Cannot initialize Graph Client: SharePoint environment variables are missing.");
  }
  
  try {
    const authProvider = {
      getAccessToken: async (): Promise<string> => {
        const authResponse = await cca.acquireTokenByClientCredential({ scopes });
        if (!authResponse || !authResponse.accessToken) {
          throw new Error('Failed to acquire access token for Graph request.');
        }
        return authResponse.accessToken;
      },
    };
    const client = Client.initWithMiddleware({ authProvider });
    graphClient = client;
    return graphClient;
  } catch (error) {
    console.error("Error initializing Graph client:", error);
    throw new Error("Could not connect to Microsoft Graph.");
  }
}

async function getSiteId(client: Client, siteUrl: string): Promise<string> {
    if (idCache.siteId) {
        return idCache.siteId;
    }
    const url = new URL(siteUrl);
    const sitePath = url.pathname;
    const hostname = url.hostname;
    try {
        const site = await client.api(`/sites/${hostname}:${sitePath}`).get();
        idCache.siteId = site.id;
        return site.id;
    } catch(error) {
        console.error(`Error fetching site ID for ${siteUrl}:`, error);
        throw new Error("Could not retrieve SharePoint Site ID.");
    }
}

async function getListId(client: Client, siteId: string, listName: string): Promise<string> {
    if (idCache.listIds.has(listName)) {
        return idCache.listIds.get(listName)!;
    }
    try {
        const response = await client.api(`/sites/${siteId}/lists`)
            .filter(`displayName eq '${listName}'`)
            .select('id')
            .get();
        if (response.value && response.value.length === 1) {
            const listId = response.value[0].id;
            idCache.listIds.set(listName, listId);
            return listId;
        } else if (response.value && response.value.length > 1) {
            throw new Error(`Multiple lists found with the name '${listName}'. Please use a unique name.`);
        } else {
            throw new Error(`List '${listName}' not found in the specified SharePoint site.`);
        }
    } catch(error: any) {
        console.error(`Error fetching list ID for '${listName}':`, error);
        if (error.message.includes('not found')) {
            throw error;
        }
        throw new Error(`Could not retrieve SharePoint List ID for '${listName}'.`);
    }
}


// --- SOX Service Logic ---

const SHAREPOINT_CONTROLS_LIST_NAME = 'LISTA-MATRIZ-SOX';
const SHAREPOINT_HISTORY_LIST_NAME = 'REGISTRO-MATRIZ';
const SHAREPOINT_ACCESS_LIST_NAME = 'lista-acessos';

let controlsColumnMapCache: Map<string, string> | null = null;

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
    
    const response = await graphClient
        .api(`/sites/${siteId}/lists/${listId}/columns`)
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
        if (spColumn.lookup) return 'text';
        if (spColumn.personOrGroup) return 'text';
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
            console.warn(`No SharePoint display name mapping found for app key '${String(appKey)}'. Attempting to update using app key directly.`);
        }

        const spInternalName = columnMap.get(spDisplayName);
        if (!spInternalName) {
            throw new Error(`Could not find SharePoint internal column name for '${spDisplayName || String(appKey)}'. The column may not exist or is not accessible.`);
        }

        const booleanFields = new Set(['mrc', 'aplicavelIPE', 'ipe_C', 'ipe_EO', 'ipe_VA', 'ipe_OR', 'ipe_PD', 'impactoMalhaSul']);
        let finalValue = value;
        if (booleanFields.has(appKey as string)) {
            finalValue = parseSharePointBoolean(finalValue);
        }

        const fieldsToUpdate = {
            [spInternalName]: finalValue
        };

        return await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items/${spListItemId}/fields`)
            .patch(fieldsToUpdate);

    } catch (error: any) {
        console.error(`Failed to update field '${String(fieldToUpdate.appKey)}' on item '${spListItemId}' in SharePoint:`, error);
        
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
        newValue: fields.Descricaocampo,
        reviewedBy: fields.field_10,
        reviewDate: fields.field_11,
        adminFeedback: fields.field_12 || '',
    };

    try {
        if(request.newValue) {
            request.newValue = JSON.parse(request.newValue)
        }
    } catch (e) {
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

export const getAccessListColumns = async (): Promise<SharePointColumn[]> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_ACCESS_LIST_NAME) {
        throw new Error("SharePoint configuration is missing for access list.");
    }
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const listId = await getListId(graphClient, siteId, SHAREPOINT_ACCESS_LIST_NAME);
    
    const response = await graphClient
        .api(`/sites/${siteId}/lists/${listId}/columns`)
        .get();

    if (!response || !response.value) {
      throw new Error("Could not fetch column details from SharePoint access list.");
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

const mapSpItemToMockUser = (item: any): MockUser | null => {
    if (!item || !item.fields) return null;

    const fields = item.fields;
    const roles: string[] = [];
    if (parseSharePointBoolean(fields.acesso_x002d_admin)) {
        roles.push('admin');
    }
    if (parseSharePointBoolean(fields.acesso_x002d_donocontrole)) {
        roles.push('control-owner');
    }

    if (roles.length === 0) {
        return null;
    }

    const primaryProfile: UserProfileType = roles.includes('admin')
        ? 'Administrador de Controles Internos'
        : 'Dono do Controle';
    
    return {
        id: item.id,
        spListItemId: item.id,
        name: fields.Title || 'Nome não encontrado',
        email: fields.e_x002d_mail2,
        roles: roles,
        activeProfile: primaryProfile,
    };
};

export const getAccessUsers = async (): Promise<MockUser[]> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_ACCESS_LIST_NAME) {
        throw new Error("SharePoint configuration is missing for access list.");
    }
    try {
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const accessListId = await getListId(graphClient, siteId, SHAREPOINT_ACCESS_LIST_NAME);

        let response = await graphClient
            .api(`/sites/${siteId}/lists/${accessListId}/items?expand=fields`)
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
        
        return allItems
            .map(mapSpItemToMockUser)
            .filter((user): user is MockUser => user !== null);

    } catch (error: any) {
        console.error("Failed to get access users from SharePoint:", error);
        throw new Error(`Could not retrieve access users. Reason: ${error.message}`);
    }
};

export const findUserByEmail = async (email: string): Promise<MockUser | null> => {
    if (!email) return null;
    const lowerCaseEmail = email.toLowerCase();
    try {
        const allUsers = await getAccessUsers();
        return allUsers.find(user => user?.email?.toLowerCase() === lowerCaseEmail) || null;
    } catch (error: any) {
        console.error(`Failed to find user with email ${email}:`, error);
        throw new Error(`Error during user lookup. Reason: ${error.message}`);
    }
};

export const addAccessUser = async (userData: { name: string; email: string }): Promise<MockUser> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_ACCESS_LIST_NAME) {
      throw new Error("SharePoint access list is not configured.");
    }
    
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const accessListId = await getListId(graphClient, siteId, SHAREPOINT_ACCESS_LIST_NAME);
    
    const fieldsToCreate = {
        'Title': userData.name,
        'e_x002d_mail2': userData.email.toLowerCase(),
        'acesso_x002d_donocontrole': 'Sim',
        'acesso_x002d_admin': 'Não',
    };

    const response = await graphClient
        .api(`/sites/${siteId}/lists/${accessListId}/items`)
        .post({ fields: fieldsToCreate });

    const newUser = mapSpItemToMockUser({ ...response, fields: { ...response.fields, ...fieldsToCreate } });

    if (!newUser) {
        throw new Error("Failed to map the newly created user from SharePoint response.");
    }
    return newUser;
};

export const updateAccessUserRoles = async (userId: string, roles: { isAdmin: boolean; isControlOwner: boolean }): Promise<void> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_ACCESS_LIST_NAME) {
      throw new Error("SharePoint access list is not configured.");
    }
    
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const accessListId = await getListId(graphClient, siteId, SHAREPOINT_ACCESS_LIST_NAME);

    const fieldsToUpdate = {
        'acesso_x002d_admin': roles.isAdmin ? 'Sim' : 'Não',
        'acesso_x002d_donocontrole': roles.isControlOwner ? 'Sim' : 'Não',
    };
    
    await graphClient
        .api(`/sites/${siteId}/lists/${accessListId}/items/${userId}/fields`)
        .patch(fieldsToUpdate);
};

export const deleteAccessUser = async (userId: string): Promise<void> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_ACCESS_LIST_NAME) {
      throw new Error("SharePoint access list is not configured.");
    }
    
    const graphClient = await getGraphClient();
    const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
    const accessListId = await getListId(graphClient, siteId, SHAREPOINT_ACCESS_LIST_NAME);

    await graphClient
        .api(`/sites/${siteId}/lists/${accessListId}/items/${userId}`)
        .delete();
};

export const getTenantUsers = async (searchQuery: string): Promise<TenantUser[]> => {
  if (!searchQuery || searchQuery.trim().length < 3) return [];
  const graphClient = await getGraphClient();
  const filterString = `(startsWith(displayName, '${searchQuery}') or startsWith(mail, '${searchQuery}')) and accountEnabled eq true`;
  const response = await graphClient.api('/users').header('ConsistencyLevel', 'eventual').count(true).filter(filterString).top(25).select('id,displayName,mail,userPrincipalName').get();
  return response.value.map((user: any) => ({ id: user.id, name: user.displayName, email: user.mail || user.userPrincipalName }));
};

    