// src/services/sox-service.ts
import {
  mockSoxControls,
  mockChangeRequests,
  mockUsers,
  mockNotifications,
  mockProcessos,
  mockSubProcessos,
  mockDonos,
  mockResponsaveis,
  mockN3Responsaveis,
  mockVersionHistory,
} from '@/data/mock-data';
import type { SoxControl, ChangeRequest, MockUser, Notification, VersionHistoryEntry, UserProfileType } from '@/types';

// READ
export const getSoxControls = async (): Promise<SoxControl[]> => JSON.parse(JSON.stringify(mockSoxControls));
export const getChangeRequests = async (): Promise<ChangeRequest[]> => JSON.parse(JSON.stringify(mockChangeRequests));
export const getUsers = async (): Promise<MockUser[]> => JSON.parse(JSON.stringify(mockUsers));
export const getNotifications = async (userId: string): Promise<Notification[]> => JSON.parse(JSON.stringify(mockNotifications.filter(n => n.userId === userId)));
export const getVersionHistory = async (): Promise<VersionHistoryEntry[]> => JSON.parse(JSON.stringify(mockVersionHistory));

export const getFilterOptions = async () => {
    return {
        processos: [...mockProcessos],
        subProcessos: [...mockSubProcessos],
        donos: [...new Set([...mockDonos, ...mockChangeRequests.map(cr => cr.requestedBy)])],
        responsaveis: [...mockResponsaveis],
        n3Responsaveis: [...mockN3Responsaveis],
    };
};


// WRITE
export const addSoxControl = async (controlData: Partial<SoxControl>): Promise<SoxControl> => {
  const newId = String(mockSoxControls.length + 1 + Date.now());
  const newControl: SoxControl = {
    ...controlData,
    id: newId,
    status: 'Ativo',
    lastUpdated: new Date().toISOString(),
  } as SoxControl;
  mockSoxControls.push(newControl);
  
  mockVersionHistory.unshift({
    id: `vh-admin-new-${newControl.id}-${Date.now()}`,
    controlId: newControl.id,
    changeDate: new Date().toISOString(),
    changedBy: "Admin", // Placeholder, ideally get current user
    summaryOfChanges: `Controle ${newControl.controlId} criado diretamente.`,
    newValues: { ...newControl },
  });

  return JSON.parse(JSON.stringify(newControl));
};

export const addSoxControlsInBulk = async (controls: Partial<SoxControl>[]): Promise<number> => {
    let controlsAdded = 0;
    controls.forEach((control, index) => {
        if (control.controlId && control.controlName && control.description) {
            const newSoxControl: SoxControl = {
                ...control,
                id: String(mockSoxControls.length + 1 + index),
                status: "Ativo",
                lastUpdated: new Date().toISOString(),
            } as SoxControl;
            mockSoxControls.push(newSoxControl);
            controlsAdded++;
        }
    });
    return controlsAdded;
};


export const addChangeRequest = async (requestData: Partial<ChangeRequest>): Promise<ChangeRequest> => {
    const newRequest: ChangeRequest = {
        ...requestData,
        id: `cr-new-${Date.now()}`,
        requestDate: new Date().toISOString(),
    } as ChangeRequest;
    mockChangeRequests.unshift(newRequest);
    return JSON.parse(JSON.stringify(newRequest));
};

export const addUser = async (userData: {name: string, email: string}): Promise<MockUser> => {
    const newUser: MockUser = {
        id: `user-new-${Date.now()}`,
        name: userData.name,
        email: userData.email,
        password: 'DefaultPassword123', // Placeholder
        roles: ['control-owner'], // Default role
        activeProfile: 'Dono do Controle',
    };
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
