export type UserProfile = {
  userId: string;
  email: string;
  displayName: string;
  roleKey: string;
  roleName: string;
  tenantId: string;
  tenantName: string;
};

export type CurrentUser = UserProfile & {
  modules: string[];
};

export type AuthLoginResponse = UserProfile & {
  token: string;
};

export type ApiError = {
  error: string;
  message: string;
};
