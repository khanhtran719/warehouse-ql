import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ListPartnersDto, PartnerDto } from './partners.dto';
import { PartnersService } from './partners.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class PartnersController {
  constructor(private service: PartnersService) {}

  @Get('customers') listCustomers(@Query() query: ListPartnersDto) {
    return this.service.listCustomers(query);
  }

  @Roles('ADMIN')
  @Post('customers')
  createCustomer(@Body() dto: PartnerDto) {
    return this.service.createCustomer(dto);
  }

  @Roles('ADMIN')
  @Patch('customers/:id')
  updateCustomer(@Param('id') id: string, @Body() dto: PartnerDto) {
    return this.service.updateCustomer(id, dto);
  }

  @Get('suppliers') listSuppliers(@Query() query: ListPartnersDto) {
    return this.service.listSuppliers(query);
  }

  @Roles('ADMIN')
  @Post('suppliers')
  createSupplier(@Body() dto: PartnerDto) {
    return this.service.createSupplier(dto);
  }

  @Roles('ADMIN')
  @Patch('suppliers/:id')
  updateSupplier(@Param('id') id: string, @Body() dto: PartnerDto) {
    return this.service.updateSupplier(id, dto);
  }
}
