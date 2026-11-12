import {ArgumentsHost,Catch,ExceptionFilter,HttpException} from '@nestjs/common';
import {apiText} from './api-i18n';
@Catch(HttpException)
export class ApiExceptionI18nFilter implements ExceptionFilter{
 catch(exception:HttpException,host:ArgumentsHost){
  const http=host.switchToHttp();const req=http.getRequest<any>();const res=http.getResponse<any>();const status=exception.getStatus();const raw:any=exception.getResponse();
  if(raw&&typeof raw==='object'&&typeof raw.messageKey==='string'){const message=apiText(raw.messageKey,req?.headers?.['accept-language'],raw.params||{});return res.status(status).json({statusCode:status,message,messageKey:raw.messageKey,...(raw.params?{params:raw.params}:{})});}
  return res.status(status).json(typeof raw==='string'?{statusCode:status,message:raw}:raw);
 }
}
