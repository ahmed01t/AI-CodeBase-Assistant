const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    if (typeof window !== "undefined") {
      localStorage.setItem("codebase_token", token);
    }
  } else {
    if (typeof window !== "undefined") {
      localStorage.removeItem("codebase_token");
    }
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== "undefined") {
    return localStorage.getItem("codebase_token");
  }
  return null;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  let data: any = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || `API Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return data?.data !== undefined ? data.data : data;
}

export const api = {
  health: () => apiRequest("/health"),

  // Organizations
  listOrganizations: () => apiRequest("/organizations"),
  createOrganization: (name: string, slug: string) =>
    apiRequest("/organizations", {
      method: "POST",
      body: JSON.stringify({ name, slug }),
    }),

  // Projects
  listProjects: (organizationId?: string) =>
    apiRequest(
      organizationId
        ? `/projects?organization_id=${organizationId}&organizationId=${organizationId}`
        : "/projects"
    ),
  createProject: (organizationId: string, name: string, description?: string) =>
    apiRequest("/projects", {
      method: "POST",
      body: JSON.stringify({
        organization_id: organizationId,
        organizationId: organizationId,
        name,
        description,
      }),
    }),

  // Repositories
  listRepositories: (projectId?: string) =>
    apiRequest(
      projectId
        ? `/repositories?project_id=${projectId}&projectId=${projectId}`
        : "/repositories"
    ),
  createRepository: (body: {
    projectId: string;
    provider: string;
    externalId?: string;
    owner: string;
    name: string;
    url: string;
  }) =>
    apiRequest("/repositories", {
      method: "POST",
      body: JSON.stringify({
        project_id: body.projectId,
        projectId: body.projectId,
        provider: body.provider,
        external_id: body.externalId || `${body.owner}-${body.name}`,
        externalId: body.externalId || `${body.owner}-${body.name}`,
        owner: body.owner,
        name: body.name,
        url: body.url,
      }),
    }),

  // Ingestion
  syncRepository: (repositoryId: string, branch = "main") =>
    apiRequest(`/ingestion/sync/${repositoryId}`, {
      method: "POST",
      body: JSON.stringify({ branch }),
    }),

  // Knowledge & Semantic Search
  searchCodebase: (body: {
    projectId: string;
    repositoryId?: string;
    query: string;
    limit?: number;
    similarityThreshold?: number;
  }) =>
    apiRequest("/knowledge/search", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Conversations & Chat
  listConversations: (projectId?: string) =>
    apiRequest(projectId ? `/conversations?projectId=${projectId}` : "/conversations"),
  createConversation: (projectId: string, title?: string) =>
    apiRequest("/conversations", {
      method: "POST",
      body: JSON.stringify({ projectId, title }),
    }),
  getConversation: (conversationId: string) =>
    apiRequest(`/conversations/${conversationId}`),
  sendMessage: (conversationId: string, content: string, repositoryId?: string) =>
    apiRequest(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, repositoryId }),
    }),
};

