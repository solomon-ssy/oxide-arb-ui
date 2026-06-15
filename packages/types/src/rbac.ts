import type { IsoDateTime, UuidString } from './common';
import type {
  MenuKind,
  Operation,
  ResourceType,
  RoleKind,
  RoleStatus,
  UserStatus,
} from './enums';

export interface UserView {
  id: UuidString;
  username: string;
  nickname: string;
  avatar: null | string;
  email: null | string;
  phone: null | string;
  status: UserStatus;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Compact role projection in `GET /auth/me` — not full admin `RoleInfo`. */
export interface RoleView {
  id: UuidString;
  code: string;
  name: string;
  description: null | string;
}

/** Full role from admin CRUD (`GET /roles`, etc.). */
export interface RoleInfo {
  id: UuidString;
  code: string;
  name: string;
  description: null | string;
  kind: RoleKind;
  status: RoleStatus;
  sort: number;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface MenuInfo {
  id: UuidString;
  parent_id: null | UuidString;
  name: string;
  kind: MenuKind;
  path: null | string;
  component: null | string;
  title: string;
  icon: null | string;
  permission_code: null | string;
  sort: number;
  keep_alive: boolean;
  hide_in_menu: boolean;
  affix_tab: boolean;
  status: RoleStatus;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Flattened on the wire — `MenuInfo` fields plus `children`. */
export interface MenuTreeNode extends MenuInfo {
  children: MenuTreeNode[];
}

export interface Permission {
  resource: ResourceType;
  operation: Operation;
}

export interface PermissionCatalogEntry {
  resource: ResourceType;
  operations: Operation[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export interface MeResponse {
  user: UserView;
  roles: RoleView[];
  menus: MenuTreeNode[];
}
