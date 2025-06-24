// src/services/sox-service.ts
'use server';

import { getGraphClient, getSiteId } from './sharepoint-client';
import type { SoxControl, ChangeRequest, MockUser, Notification, VersionHistoryEntry, UserProfileType, IPEAssertions } from '@/types';
import {
  mockChangeRequests,
  mockUsers,
  mockNotifications,
  mockVersionHistory,
} from '@/data/mock-data';

// --- SharePoint Integration ---

const { SHAREPOINT_SITE_URL, SHAREPOINT_CONTROLS_LIST_NAME } = process.env;

// Helper to map SharePoint list item to our SoxControl type
const mapSharePointItemToSoxControl = (item: any): SoxControl => {
  const fields = item.fields;

  // Safely parse JSON for ipeAssertions
  let ipeAssertions: IPEAssertions = { C: false, EO: false, VA: false, OR: false, PD: false };
  if (fields.ipeAssertions) {
      try {
          const parsed = JSON.parse(fields.ipeAssertions);
          if(typeof parsed === 'object' && parsed !== null) {
            ipeAssertions = { ...ipeAssertions, ...parsed };
          }
      } catch (e) {
          console.error(`Failed to parse ipeAssertions for item ${fields.id}:`, fields.ipeAssertions);
      }
  }

  return {
    id: item.id, // Use SharePoint's internal item ID
    controlId: fields.controlId || '',
    controlName: fields.Title || fields.controlName || '', // Title is the default name column
    description: fields.description || '',
    controlOwner: fields.controlOwner?.LookupValue || '',
    controlFrequency: fields.controlFrequency || 'Ad-hoc',
    controlType: fields.controlType || 'Preventivo',
    status: fields.status || 'Inativo',
    lastUpdated: item.lastModifiedDateTime,
    processo: fields.processo,
    subProcesso: fields.subProcesso,
    modalidade: fields.modalidade,
    responsavel: fields.responsavel?.LookupValue || '',
    n3Responsavel: fields.n3Responsavel?.LookupValue || '',
    codigoAnterior: fields.codigoAnterior,
    matriz: fields.matriz,
    riscoId: fields.riscoId,
    riscoDescricao: fields.riscoDescricao,
    riscoClassificacao: fields.riscoClassificacao,
    codigoCosan: fields.codigoCosan,
    objetivoControle: fields.objetivoControle,
    tipo: fields.tipo,
    mrc: fields.mrc === true,
    evidenciaControle: fields.evidenciaControle,
    implementacaoData: fields.implementacaoData,
    dataUltimaAlteracao: fields.dataUltimaAlteracao,
    sistemasRelacionados: fields.sistemasRelacionados ? fields.sistemasRelacionados.split(';').map((s:string) => s.trim()) : [],
    executorControle: fields.executorControle ? fields.executorControle.split(';').map((s:string) => s.trim()) : [],
    transacoesTelasMenusCriticos: fields.transacoesTelasMenusCriticos,
    aplicavelIPE: fields.aplicavelIPE === true,
    ipeAssertions: ipeAssertions,
    executadoPor: fields.executadoPor,
    area: fields.area,
    vpResponsavel: fields.vpResponsavel,
    impactoMalhaSul: fields.impactoMalhaSul === true,
    sistemaArmazenamento: fields.sistemaArmazenamento,
  };
};

export const getSoxControls = async (): Promise<SoxControl[]> => {
    if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
        throw new Error("SharePoint site URL or list name is not configured.");
    }
    
    try {
        const graphClient = await getGraphClient();
        const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);
        
        const response = await graphClient
            .api(`/sites/${siteId}/lists/${SHAREPOINT_CONTROLS_LIST_NAME}/items?expand=fields(select=*)`)
            .get();

        if (response && response.value) {
            return response.value.map(mapSharePointItemToSoxControl);
        }
        return [];
    } catch (error) {
        console.error("Failed to get SOX controls from SharePoint:", error);
        return [];
    }
};

export const addSoxControl = async (controlData: Partial<SoxControl>): Promise<SoxControl> => {
  if (!SHAREPOINT_SITE_URL || !SHAREPOINT_CONTROLS_LIST_NAME) {
    throw new Error("SharePoint site URL or list name is not configured.");
  }
  
  const graphClient = await getGraphClient();
  const siteId = await getSiteId(graphClient, SHAREPOINT_SITE_URL);

  const fieldsToCreate: any = {
    // Text fields
    controlId: controlData.controlId,
    controlName: controlData.controlName,
    Title: controlData.controlName, // Also set the default Title field
    description: controlData.description,
    controlFrequency: controlData.controlFrequency,
    controlType: controlData.controlType,
    status: controlData.status || 'Ativo',
    processo: controlData.processo,
    subProcesso: controlData.subProcesso,
    modalidade: controlData.modalidade,
    codigoAnterior: controlData.codigoAnterior,
    matriz: controlData.matriz,
    riscoId: controlData.riscoId,
    riscoDescricao: controlData.riscoDescricao,
    riscoClassificacao: controlData.riscoClassificacao,
    codigoCosan: controlData.codigoCosan,
    objetivoControle: controlData.objetivoControle,
    tipo: controlData.tipo,
    evidenciaControle: controlData.evidenciaControle,
    implementacaoData: controlData.implementacaoData,
    dataUltimaAlteracao: controlData.dataUltimaAlteracao,
    transacoesTelasMenusCriticos: controlData.transacoesTelasMenusCriticos,
    executadoPor: controlData.executadoPor,
    area: controlData.area,
    vpResponsavel: controlData.vpResponsavel,
    sistemaArmazenamento: controlData.sistemaArmazenamento,
    
    // Boolean fields
    mrc: controlData.mrc,
    aplicavelIPE: controlData.aplicavelIPE,
    impactoMalhaSul: controlData.impactoMalhaSul,

    // Array of strings, converted to ; separated string
    sistemasRelacionados: controlData.sistemasRelacionados?.join('; '),
    executorControle: controlData.executorControle?.join('; '),

    // JSON object, converted to string
    ipeAssertions: controlData.ipeAssertions ? JSON.stringify(controlData.ipeAssertions) : null,

    // Person fields are intentionally OMITTED here to avoid errors.
    // The SharePoint API requires a user's LookupId, not their name as a string.
    // A future update would involve looking up user IDs before creating the item.
  };

  // Remove null/undefined fields from the payload to avoid sending empty values
  Object.keys(fieldsToCreate).forEach(key => {
    if (fieldsToCreate[key] === undefined || fieldsToCreate[key] === null) {
      delete fieldsToCreate[key];
    }
  });
  
  const newItem = {
      fields: fieldsToCreate
  };

  const response = await graphClient
      .api(`/sites/${siteId}/lists/${SHAREPOINT_CONTROLS_LIST_NAME}/items`)
      .post(newItem);

  return mapSharePointItemToSoxControl(response);
};

export const addSoxControlsInBulk = async (controls: Partial<SoxControl>[]): Promise<number> => {
    let controlsAdded = 0;
    // Batching is recommended for >20 items, but for simplicity we do it one by one.
    for (const control of controls) {
        try {
            if (control.controlId && control.controlName && control.description) {
                await addSoxControl(control);
                controlsAdded++;
            }
        } catch (error) {
            console.error(`Failed to add control in bulk: ${control.controlId}`, error);
        }
    }
    return controlsAdded;
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
