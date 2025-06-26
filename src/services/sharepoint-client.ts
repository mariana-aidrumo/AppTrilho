// src/services/sharepoint-client.ts
'use server';

import 'isomorphic-fetch'; // Required polyfill for Microsoft Graph client
import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication, Configuration, LogLevel } from '@azure/msal-node';

// Validate environment variables
const {
  SHAREPOINT_TENANT_ID,
  SHAREPOINT_CLIENT_ID,
  SHAREPOINT_CLIENT_SECRET,
  SHAREPOINT_SITE_URL,
} = process.env;

if (!SHAREPOINT_TENANT_ID || !SHAREPOINT_CLIENT_ID || !SHAREPOINT_CLIENT_SECRET || !SHAREPOINT_SITE_URL) {
  throw new Error("Missing SharePoint environment variables. Please check your .env file.");
}

const msalConfig: Configuration = {
  auth: {
    clientId: SHAREPOINT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${SHAREPOINT_TENANT_ID}`,
    clientSecret: SHAREPOINT_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning, // Use Warning or Error in production
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
// MODIFIED: Cache now supports multiple list IDs
const idCache: { siteId?: string; listIds: Map<string, string> } = { listIds: new Map() };


/**
 * Initializes and returns a Microsoft Graph client instance.
 * It handles acquiring an authentication token using the client credentials flow.
 */
export async function getGraphClient(): Promise<Client> {
  // Return cached client if available
  if (graphClient) {
    return graphClient;
  }

  try {
    // The authProvider is called by the Graph client middleware before each API request.
    // It's responsible for acquiring a valid token. MSAL handles caching.
    const authProvider = {
      getAccessToken: async (): Promise<string> => {
        const authResponse = await cca.acquireTokenByClientCredential({ scopes });
        if (!authResponse || !authResponse.accessToken) {
          throw new Error('Failed to acquire access token for Graph request.');
        }
        return authResponse.accessToken;
      },
    };

    // Initialize the Graph client with the dynamic auth provider
    const client = Client.initWithMiddleware({ authProvider });

    graphClient = client;
    return graphClient;

  } catch (error) {
    console.error("Error initializing Graph client:", error);
    throw new Error("Could not connect to Microsoft Graph.");
  }
}

/**
 * Retrieves the SharePoint Site ID from a given site URL.
 * The format is: {hostname},{site-collection-id},{site-id}
 */
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

/**
 * Retrieves the SharePoint List ID from a given list name.
 */
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
