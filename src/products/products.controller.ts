import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Idempotent } from 'src/common/decorators';
import { CurrentUser, Roles } from 'src/auth/decorators';
import { AssignedRole as Role } from 'src/generated/prisma/enums';

@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}
}
