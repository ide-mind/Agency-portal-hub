export interface ClickUpList {
  id: string;
  name: string;
  content?: string;
}

export interface ClickUpStatus {
  status: string;
  color: string;
  type: string;
}

export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string | null;
}

export interface ClickUpTask {
  id: string;
  name: string;
  status: ClickUpStatus;
  assignees: ClickUpUser[];
  due_date: string | null;
  date_created: string;
  url: string;
  parent?: string | null;
}

export interface ClickUpListResponse {
  lists: ClickUpList[];
}

export interface ClickUpTaskResponse {
  tasks: ClickUpTask[];
}

export interface AppConfig {
  clickUpApiKey: string;
  clickUpFolderId: string;
  googleApiKey: string;
}

export interface Metrics {
  total: number;
  completed: number;
  inProgress: number;
  byStatus: { name: string; value: number; fill: string }[];
}