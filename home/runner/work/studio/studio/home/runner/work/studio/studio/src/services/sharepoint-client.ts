// src/services/sharepoint-client.ts
'use server';

import 'isomorphic-fetch'; // Required polyfill for Microsoft Graph client
import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication, Configuration, LogLevel } from '@azure/msal-node';

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

export async function getGraphClient(): Promise<Client> {
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

export async function getSiteId(client: Client, siteUrl: string): Promise<string> {
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

export async function getListId(client: Client, siteId: string, listName: string): Promise<string> {
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
