
// src/services/sox-service.ts
'use server';

import { getGraphClient, getSiteId, getListId } from './sharepoint-client';
import type { SoxControl, ChangeRequest, MockUser, Notification, VersionHistoryEntry, UserProfileType, SoxControlStatus, SharePointColumn, TenantUser } from '@/types';
import {
  mockChangeRequests,
  mockUsers,
  mockNotifications,
  mockVersionHistory,
  mockSoxControls,
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
     // START MOCK-ONLY RETURN
    if (process.env.USE_MOCK_DATA === 'true') {
        return JSON.parse(JSON.stringify(mockSoxControls));
    }
    // END MOCK-ONLY RETURN

    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint site URL or list name is not configured.");
    }
    
    try {
        const columnMap = await buildColumnMappings();
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

    const columnMap = await buildColumnMappings();
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


// --- Mocked Data Services (To be migrated to SharePoint) ---

export const getChangeRequests = async (): Promise<ChangeRequest[]> => JSON.parse(JSON.stringify(mockChangeRequests));
export const getUsers = async (): Promise<MockUser[]> => JSON.parse(JSON.stringify(mockUsers));
export const getNotifications = async (userId: string): Promise<Notification[]> => JSON.parse(JSON.stringify(mockNotifications.filter(n => n.userId === userId)));
export const getVersionHistory = async (): Promise<VersionHistoryEntry[]> => JSON.parse(JSON.stringify(mockVersionHistory));

export const addChangeRequest = async (requestData: Partial<ChangeRequest>): Promise<ChangeRequest> => {
    console.warn("addChangeRequest is using mock data.");
    const newRequest: ChangeRequest = {
        id: `cr-new-${Date.now()}`,
        requestDate: new Date().toISOString(),
        status: "Pendente",
        ...requestData, // This will include controlId, controlName, changes, requestedBy, requestType, comments
    } as ChangeRequest;
    mockChangeRequests.unshift(newRequest);

    // Also add a notification for the admin
    const adminUser = mockUsers.find(u => u.roles.includes('admin'));
    if (adminUser && newRequest.requestType) {
        mockNotifications.unshift({
            id: `notif-${newRequest.id}`,
            userId: adminUser.id,
            message: `Nova solicitação de ${newRequest.requestType.toLowerCase()} (${newRequest.controlName}) por ${newRequest.requestedBy}.`,
            date: new Date().toISOString(),
            read: false,
        });
    }
    return JSON.parse(JSON.stringify(newRequest));
};

export const updateChangeRequestStatus = async (
  requestId: string,
  newStatus: 'Aprovado' | 'Rejeitado',
  reviewedBy: string
): Promise<ChangeRequest> => {
  console.warn("updateChangeRequestStatus is using mock data.");
  
  const requestIndex = mockChangeRequests.findIndex(r => r.id === requestId);
  if (requestIndex === -1) {
    throw new Error("Solicitação não encontrada.");
  }

  const request = mockChangeRequests[requestIndex];
  request.status = newStatus;
  request.reviewedBy = reviewedBy;
  request.reviewDate = new Date().toISOString();

  if (newStatus === 'Aprovado') {
    if (request.requestType === 'Alteração') {
      const controlIndex = mockSoxControls.findIndex(c => c.controlId === request.controlId);
      if (controlIndex !== -1) {
        Object.assign(mockSoxControls[controlIndex], request.changes);
        mockSoxControls[controlIndex].lastUpdated = new Date().toISOString();
      } else {
        console.error(`Controle com ID ${request.controlId} não encontrado para aplicar a alteração.`);
        request.status = 'Pendente'; 
        throw new Error(`Controle com ID ${request.controlId} não encontrado.`);
      }
    } else if (request.requestType === 'Criação') {
      const newControl: SoxControl = {
        id: `ctrl-mock-${Date.now()}`,
        status: 'Ativo',
        lastUpdated: new Date().toISOString(),
        ...request.changes,
        controlId: request.changes.controlId || `NEW-${Date.now()}`,
        controlName: request.changes.controlName || "Novo Controle (sem nome)",
        controlOwner: request.changes.controlOwner || "Não atribuído",
        controlFrequency: request.changes.controlFrequency || "Ad-hoc",
        controlType: request.changes.controlType || "Detectivo",
      } as SoxControl;
      mockSoxControls.push(newControl);
    }
  }

  const requester = mockUsers.find(u => u.name === request.requestedBy);
  if (requester) {
    mockNotifications.unshift({
      id: `notif-status-${request.id}`,
      userId: requester.id,
      message: `Sua solicitação (${request.id}) para ${request.controlName || request.controlId} foi ${newStatus.toLowerCase()}.`,
      date: new Date().toISOString(),
      read: false,
    });
  }

  return JSON.parse(JSON.stringify(request));
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
