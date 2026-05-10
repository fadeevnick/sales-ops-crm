export type DemoUser = {
  userId: string;
  email: string;
  displayName: string;
  roleKey: string;
  roleName: string;
  tenantId: string;
  tenantName: string;
};

export type CurrentUser = DemoUser & {
  modules: string[];
};

export type DemoLoginResponse = DemoUser & {
  tokenHint: string;
};

export type ApiError = {
  error: string;
  message: string;
};
