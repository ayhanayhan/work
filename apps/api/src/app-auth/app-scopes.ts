import { SetMetadata } from '@nestjs/common';
export const APP_SCOPES_KEY='ticarti:app-scopes';
export const RequireAppScopes=(...scopes:string[])=>SetMetadata(APP_SCOPES_KEY,scopes);
