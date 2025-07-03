
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


// This function is simplified and currently not used for the main logic,
// but kept for features like template download.
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

const mapSharePointItemToSoxControl = (item: any): SoxControl => {
    const spFields = item.fields;
    if (!spFields) return {} as SoxControl;

    const soxControl: Partial<SoxControl> = {
        id: item.id,
        status: (spFields.status as SoxControlStatus) || 'Ativo',
        lastUpdated: item.lastModifiedDateTime,
    };
    
    // Direct mapping for known fields to avoid dynamic lookup issues
    soxControl.codigoAnterior = spFields.C_x00f3_d_x0020_Controle_x0020_A;
    soxControl.matriz = spFields.Matriz;
    soxControl.processo = spFields.Processo;
    soxControl.subProcesso = spFields.Sub_x002d_Processo;
    soxControl.riscoId = spFields.Risco;
    soxControl.riscoDescricao = spFields.Descri_x00e7__x00e3_o_x0020_do_x;
    soxControl.riscoClassificacao = spFields.Classifica_x00e7__x00e3_o_x0020_d;
    soxControl.controlId = spFields.C_x00f3_digo_x0020_NOVO;
    soxControl.codigoCosan = spFields.C_x00f3_digo_x0020_COSAN;
    soxControl.objetivoControle = spFields.Objetivo_x0020_do_x0020_Controle;
    soxControl.controlName = spFields.Nome_x0020_do_x0020_Controle;
    soxControl.descriptionAnterior = spFields.Descri_x00e7__x00e3_o_x0020_do_x0;
    soxControl.description = spFields.Descri_x00e7__x00e3_o_x0020_do_x1;
    soxControl.tipo = spFields.Tipo;
    soxControl.controlFrequency = spFields.Frequ_x00ea_ncia;
    soxControl.modalidade = spFields.Modalidade;
    soxControl.controlType = spFields.P_x002f_D;
    soxControl.mrc = parseSharePointBoolean(spFields.MRC_x003f_);
    soxControl.evidenciaControle = spFields.Evid_x00ea_ncia_x0020_do_x0020_c;
    soxControl.implementacaoData = spFields.Implementa_x00e7__x00e3_o_x0020_D;
    soxControl.dataUltimaAlteracao = spFields.Data_x0020__x00fa_ltima_x0020_al;
    soxControl.sistemasRelacionados = spFields.Sistemas_x0020_Relacionados;
    soxControl.transacoesTelasMenusCriticos = spFields.Transa_x00e7__x00f5_es_x002f_Telas;
    soxControl.aplicavelIPE = parseSharePointBoolean(spFields.Aplic_x00e1_vel_x0020_IPE_x003f_);
    soxControl.ipe_C = parseSharePointBoolean(spFields.C);
    soxControl.ipe_EO = parseSharePointBoolean(spFields.E_x002f_O);
    soxControl.ipe_VA = parseSharePointBoolean(spFields.V_x002f_A);
    soxControl.ipe_OR = parseSharePointBoolean(spFields.O_x002f_R);
    soxControl.ipe_PD = parseSharePointBoolean(spFields.P_x002f_D_x0020__x0028_IPE_x0029_);
    soxControl.responsavel = spFields.Respons_x00e1_vel;
    soxControl.controlOwner = spFields.Dono_x0020_do_x0020_Controle_x00;
    soxControl.executorControle = spFields.Executor_x0020_do_x0020_Controle;
    soxControl.executadoPor = spFields.Executado_x0020_por;
    soxControl.n3Responsavel = spFields.N3_x0020_Respons_x00e1_vel;
    soxControl.area = spFields._x00c1_rea;
    soxControl.vpResponsavel = spFields.VP_x0020_Respons_x00e1_vel;
    soxControl.impactoMalhaSul = parseSharePointBoolean(spFields.Impacto_x0020_Malha_x0020_Sul);
    soxControl.sistemaArmazenamento = spFields.Sistema_x0020_Armazenamento;
    
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
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        const listId = await getListId(graphClient, siteId, SHAREPOINT_CONTROLS_LIST_NAME);
        
        let response = await graphClient
            .api(`/sites/${siteId}/lists/${listId}/items?expand=fields`)
            .get();

        const allControls: SoxControl[] = [];
        while (response && response.value) {
            allControls.push(...response.value.map(mapSharePointItemToSoxControl));
            if (response['@odata.nextLink']) {
                response = await graphClient.api(response['@odata.nextLink']).get();
            } else {
                break;
            }
        }
        return allControls;
    } catch (error) {
        console.error("Failed to get SOX controls from SharePoint:", error);
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
    // Safety check: if an item has no fields, it's invalid. Skip it to prevent crashes.
    if (!fields) return null;

    let changes = {};
    if (fields.DadosAlteracaoJSON) {
        try { changes = JSON.parse(fields.DadosAlteracaoJSON); } catch (e) { console.error("Failed to parse DadosAlteracaoJSON for item ID:", item.id, e); }
    }
    
    const reviewedBy = fields.RevisadoPor;
    const reviewDate = fields.DataRevisao;
    
    let status: ChangeRequestStatus;

    // The user's rule: if it hasn't been reviewed, it's 'Pendente'.
    if (!reviewedBy && !reviewDate) {
        status = 'Pendente';
    } else {
        // If it has been reviewed, use the status from SharePoint.
        // Fallback to a "processed" status to prevent it from reappearing in the pending queue.
        status = fields.StatusFinal || fields.Status_x0020_Final || 'Aprovado';
    }

    return {
        id: fields.IDdaSolicitacao || fields.Title, // Fallback to Title to ensure an ID
        spListItemId: item.id,
        controlId: fields.IDControle,
        controlName: fields.NomeControle,
        requestType: fields.Tipo || 'Alteração', // Fallback to prevent crashes on filter
        requestedBy: fields.SolicitadoPor,
        requestDate: fields.DataSolicitacao || item.lastModifiedDateTime,
        status: status, // Status is now always a valid value
        changes: changes,
        comments: fields.DetalhesDaMudanca,
        reviewedBy: reviewedBy,
        reviewDate: reviewDate,
        adminFeedback: fields.FeedbackAdmin,
    };
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
            .filter((req): req is ChangeRequest => req !== null); // Filter out any invalid items
        
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
    
    // These are the SharePoint internal field names we are writing to.
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
        if (Object.keys(originalRequest.changes).length > 0) {
            await graphClient.api(`/sites/${siteId}/lists/${controlsListId}/items/${controlItemSpId}/fields`).patch(originalRequest.changes);
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
