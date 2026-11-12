import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { HelpService } from './help.service';
@Controller('superadmin/help')
@UseGuards(SuperAdminAuthGuard)
export class HelpAdminController{constructor(private svc:HelpService){}@Get()all(){return this.svc.admin()}@Post('categories')createCategory(@Body()b:any){return this.svc.saveCategory(undefined,b)}@Patch('categories/:id')updateCategory(@Param('id')id:string,@Body()b:any){return this.svc.saveCategory(id,b)}@Delete('categories/:id')deleteCategory(@Param('id')id:string){return this.svc.deleteCategory(id)}@Post('articles')createArticle(@Body()b:any){return this.svc.saveArticle(undefined,b)}@Patch('articles/:id')updateArticle(@Param('id')id:string,@Body()b:any){return this.svc.saveArticle(id,b)}@Delete('articles/:id')deleteArticle(@Param('id')id:string){return this.svc.deleteArticle(id)}}
