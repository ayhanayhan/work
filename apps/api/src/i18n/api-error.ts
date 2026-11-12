export type ApiErrorPayload={messageKey:string;params?:Record<string,string|number>};
export function apiError(messageKey:string,params?:Record<string,string|number>):ApiErrorPayload{return params?{messageKey,params}:{messageKey}}
