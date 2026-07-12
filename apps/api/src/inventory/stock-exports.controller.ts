import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateExportDto, ExportExcelDto, ListExportDto } from './dto';
import { StockExportsService } from './stock-exports.service';

@UseGuards(AuthGuard('jwt'))
@Controller('stock-exports')
export class StockExportsController {
  constructor(private service: StockExportsService) {}
  @Get() list(@Query() q: ListExportDto) {
    return this.service.list(q);
  }
  @Post() create(@Body() dto: CreateExportDto, @CurrentUser() user: CurrentUser) {
    return this.service.create(dto, user.id);
  }
  @Get('export-excel') async exportExcel(@Query() q: ExportExcelDto, @Res({ passthrough: true }) res: Response) {
    const file = await this.service.exportMonthlyExcel(q);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return file;
  }
  @Get(':id/file') downloadFile(@Param('id') id: string) {
    return this.service.downloadDeliveryFile(id);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.service.get(id);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: CreateExportDto) {
    return this.service.update(id, dto);
  }
  @Post(':id/confirm') confirm(@Param('id') id: string, @CurrentUser() user: CurrentUser) {
    return this.service.confirm(id, user.id);
  }
  @Post(':id/cancel') cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
