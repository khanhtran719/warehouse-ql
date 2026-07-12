import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CatalogService } from './catalog.service';
import { ListProductsDto, ProductDto, SimpleNameDto } from './dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class CatalogController {
  constructor(private service: CatalogService) {}
  @Get('products') listProducts(@Query() q: ListProductsDto) {
    return this.service.listProducts(q);
  }
  @Roles(UserRole.ADMIN)
  @Post('products')
  createProduct(@Body() dto: ProductDto) {
    return this.service.createProduct(dto);
  }
  @Get('products/:id') getProduct(@Param('id') id: string) {
    return this.service.getProduct(id);
  }
  @Roles(UserRole.ADMIN)
  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: ProductDto) {
    return this.service.updateProduct(id, dto);
  }
  @Get('products/:id/movements') movements(@Param('id') id: string) {
    return this.service.movements(id);
  }
  @Get('categories') categories() {
    return this.service.categories();
  }
  @Roles(UserRole.ADMIN)
  @Post('categories')
  createCategory(@Body() dto: SimpleNameDto) {
    return this.service.createCategory(dto);
  }
  @Get('units') units() {
    return this.service.units();
  }
  @Roles(UserRole.ADMIN)
  @Post('units')
  createUnit(@Body() dto: SimpleNameDto) {
    return this.service.createUnit(dto);
  }
}
