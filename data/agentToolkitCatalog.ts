import type { AgentToolApproval } from "../types/agent";

export type AgentToolkitScope =
  | "calendar"
  | "tasks"
  | "notes"
  | "communication"
  | "research"
  | "productivity"
  | "code";

export interface AgentToolkitAction {
  toolkit: string;
  action: string;
  slug: string;
  description: string;
  scope: AgentToolkitScope;
  approval: AgentToolApproval;
  read: boolean;
  write: boolean;
}

export interface AgentToolkit {
  id: string;
  name: string;
  description: string;
  actions: AgentToolkitAction[];
}

export const AGENT_TOOLKITS: AgentToolkit[] = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Manage study calendar events and sessions.",
    actions: [
      {
        toolkit: "google_calendar",
        action: "create_event",
        slug: "GOOGLECALENDAR_CREATE_EVENT",
        description: "Create a study session event.",
        scope: "calendar",
        approval: "confirm",
        read: false,
        write: true,
      },
      {
        toolkit: "google_calendar",
        action: "list_events",
        slug: "GOOGLECALENDAR_LIST_EVENTS",
        description: "List upcoming study events.",
        scope: "calendar",
        approval: "auto",
        read: true,
        write: false,
      },
    ],
  },
  {
    id: "todoist",
    name: "Todoist",
    description: "Manage study task lists and tasks.",
    actions: [
      {
        toolkit: "todoist",
        action: "create_task",
        slug: "TODOIST_CREATE_TASK",
        description: "Create a study task.",
        scope: "tasks",
        approval: "confirm",
        read: false,
        write: true,
      },
      {
        toolkit: "todoist",
        action: "list_tasks",
        slug: "TODOIST_LIST_TASKS",
        description: "List study tasks.",
        scope: "tasks",
        approval: "auto",
        read: true,
        write: false,
      },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    description: "Manage study notes and pages.",
    actions: [
      {
        toolkit: "notion",
        action: "create_page",
        slug: "NOTION_CREATE_PAGE",
        description: "Create a study notes page.",
        scope: "notes",
        approval: "confirm",
        read: false,
        write: true,
      },
      {
        toolkit: "notion",
        action: "list_pages",
        slug: "NOTION_LIST_PAGES",
        description: "List study pages.",
        scope: "notes",
        approval: "auto",
        read: true,
        write: false,
      },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Share study updates and reminders in Slack.",
    actions: [
      {
        toolkit: "slack",
        action: "send_message",
        slug: "SLACK_SEND_MESSAGE",
        description: "Send a study update to a channel.",
        scope: "communication",
        approval: "confirm",
        read: false,
        write: true,
      },
      {
        toolkit: "slack",
        action: "list_channels",
        slug: "SLACK_LIST_ALL_CHANNELS",
        description: "List available Slack channels.",
        scope: "communication",
        approval: "auto",
        read: true,
        write: false,
      },
    ],
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Read and send study emails and summaries.",
    actions: [
      {
        toolkit: "gmail",
        action: "send_email",
        slug: "GMAIL_SEND_EMAIL",
        description: "Send a study summary or reminder email.",
        scope: "communication",
        approval: "confirm",
        read: false,
        write: true,
      },
      {
        toolkit: "gmail",
        action: "fetch_emails",
        slug: "GMAIL_FETCH_EMAILS",
        description: "Find relevant study emails.",
        scope: "communication",
        approval: "auto",
        read: true,
        write: false,
      },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    description: "Track coding practice in repositories and issues.",
    actions: [
      {
        toolkit: "github",
        action: "create_issue",
        slug: "GITHUB_CREATE_AN_ISSUE",
        description: "Create a practice or study issue.",
        scope: "code",
        approval: "confirm",
        read: false,
        write: true,
      },
      {
        toolkit: "github",
        action: "list_repositories",
        slug: "GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER",
        description: "List repositories for project work.",
        scope: "code",
        approval: "auto",
        read: true,
        write: false,
      },
    ],
  },
  {
    id: "reddit",
    name: "Reddit",
    description: "Find explanations and discussions around a topic.",
    actions: [
      {
        toolkit: "reddit",
        action: "search_posts",
        slug: "REDDIT_SEARCH_ACROSS_SUBREDDITS",
        description: "Search Reddit for study discussions.",
        scope: "research",
        approval: "auto",
        read: true,
        write: false,
      },
      {
        toolkit: "reddit",
        action: "create_post",
        slug: "REDDIT_CREATE_REDDIT_POST",
        description: "Share a study question or update.",
        scope: "research",
        approval: "confirm",
        read: false,
        write: true,
      },
    ],
  },
];

export function getAgentToolkitActions(toolkit: string): AgentToolkitAction[] {
  const found = AGENT_TOOLKITS.find((item) => item.id === toolkit);
  return found?.actions ?? [];
}

export function getAgentToolkitAction(
  toolkit: string,
  action: string,
): AgentToolkitAction | null {
  const found = AGENT_TOOLKITS.find((item) => item.id === toolkit);
  const match = found?.actions.find((item) => item.action === action);
  if (!found || !match) return null;
  return { ...match, toolkit: found.id };
}

export function isAgentToolAllowed(toolkit: string, action: string): boolean {
  const found = getAgentToolkitAction(toolkit, action);
  return found !== null && found.approval !== "disabled";
}
