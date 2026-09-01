import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto, ProductResponseDto } from './dto';
import { DuplicateProductException } from 'src/common/exceptions/duplicate-product.exception';
import { Prisma } from 'src/generated/prisma/client';
import { UomChangeRequiredException } from 'src/common/exceptions/uom-change-required.exception';
import { UpdateProductDto } from './dto/request/update-product.dto';
import { ProductHasHistoryException } from 'src/common/exceptions/product-has-history.exception';
import { DeleteProductQueryDto } from './dto/request/delete-product-query.dto';
import { DeleteProductResponseDto } from './dto/response/delete-product-response.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Helper function for generating SKU
  private generateAutoSku(
    categoryName: string,
    size?: string | null,
    thread?: string | null,
    material?: string | null,
  ): string {
    // Extract 3-letter category prefix (e.g., "BOLTS" -> "BOL")
    const catPrefix = categoryName.trim().substring(0, 3).toUpperCase();

    // Clean attributes (remove special characters, keep alphanumeric)
    const cleanSize = size
      ? size.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      : '';
    const cleanThread = thread
      ? thread.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      : '';
    const cleanMat = material
      ? material.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      : '';

    // 4-digit timestamp slice for collision safety
    const timestamp = Date.now().toString().slice(-4);

    const parts = [
      catPrefix,
      cleanSize,
      cleanThread,
      cleanMat,
      timestamp,
    ].filter(Boolean);
    return parts.join('-');
    // e.g., "BOL-M830MM-UNC-SS304-4821" or "BOL-M830MM-M8X125-SS304-4821"
  }

  /**
   * Create a new product with duplicate checking and relation validation
   */
  async createProduct(
    userId: number,
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const {
      sku,
      name,
      categoryId,
      size_dimensions,
      thread_type,
      material_grade,
      base_uom,
      current_quantity,
      reorder_point_ROP,
      pricing_uom,
      pricing_unit_qty,
      cost_price,
      retail_price,
      wholesale_price,
      binId,
      allowDuplicate,
    } = createProductDto;

    this.logger.log(
      `User #${userId} initiating product creation: "${name}" (SKU: ${sku ?? 'N/A'}, Category #${categoryId})`,
    );

    // 1. Verify existence of Category
    const categoryExists = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!categoryExists) {
      this.logger.warn(
        `Creation failed: Category #${categoryId} does not exist.`,
      );
      throw new NotFoundException(
        `Category with ID #${categoryId} does not exist.`,
      );
    }

    // 2. Verify existence of BinLocation (if provided)
    if (binId) {
      const binExists = await this.prisma.binLocation.findUnique({
        where: { id: binId },
      });

      if (!binExists) {
        this.logger.warn(
          `Creation failed: BinLocation #${binId} does not exist.`,
        );
        throw new NotFoundException(
          `BinLocation with ID #${binId} does not exist.`,
        );
      }
    }

    // 3. Strict Check: Duplicate SKU
    if (sku) {
      const existingSkuProduct = await this.prisma.product.findUnique({
        where: { sku },
      });

      if (existingSkuProduct) {
        this.logger.warn(
          `Creation blocked: SKU "${sku}" already registered to Product #${existingSkuProduct.id}`,
        );
        throw new DuplicateProductException(
          {
            id: existingSkuProduct.id,
            sku: existingSkuProduct.sku,
            name: existingSkuProduct.name,
          },
          'SKU',
        );
      }
    }

    // 4. Soft Check: Duplicate Fastener Attributes
    // If size, thread, and material are defined, check for potential identical hardware items
    const hasFastenerSpecs = size_dimensions && thread_type && material_grade;

    if (hasFastenerSpecs && !allowDuplicate) {
      const existingAttributeProduct = await this.prisma.product.findFirst({
        where: {
          categoryId,
          size_dimensions: { equals: size_dimensions, mode: 'insensitive' },
          thread_type: { equals: thread_type, mode: 'insensitive' },
          material_grade: { equals: material_grade, mode: 'insensitive' },
        },
      });

      if (existingAttributeProduct) {
        this.logger.warn(
          `Creation blocked: Identical fastener spec found (Product #${existingAttributeProduct.id} "${existingAttributeProduct.name}")`,
        );
        throw new DuplicateProductException(
          {
            id: existingAttributeProduct.id,
            sku: existingAttributeProduct.sku,
            name: existingAttributeProduct.name,
          },
          'ATTRIBUTES',
        );
      }
    }

    if (hasFastenerSpecs && allowDuplicate) {
      this.logger.log(
        `Duplicate attribute check bypassed via allowDuplicate=true`,
      );
    }

    // 5. Resolve final SKU value (User input OR Auto-generated fallback)
    let finalSku = sku?.trim();

    if (!finalSku) {
      finalSku = this.generateAutoSku(
        categoryExists.name,
        size_dimensions,
        thread_type,
        material_grade,
      );
      this.logger.log(`No SKU provided. Auto-generated SKU: "${finalSku}"`);
    }

    // 6. Duplicate Check against finalSku
    const existingSkuProduct = await this.prisma.product.findUnique({
      where: { sku: finalSku },
    });

    if (existingSkuProduct) {
      this.logger.warn(
        `Creation blocked: SKU "${finalSku}" already registered to Product #${existingSkuProduct.id}`,
      );
      throw new DuplicateProductException(
        {
          id: existingSkuProduct.id,
          sku: existingSkuProduct.sku,
          name: existingSkuProduct.name,
        },
        'SKU',
      );
    }

    // 7. Build safe Decimal payloads
    const productData: Prisma.ProductCreateInput = {
      name,
      sku: finalSku,
      size_dimensions: size_dimensions || null,
      thread_type: thread_type || null,
      material_grade: material_grade || null,
      base_uom,
      current_quantity: new Prisma.Decimal(current_quantity ?? 0),
      reorder_point_ROP: new Prisma.Decimal(reorder_point_ROP ?? 0),
      pricing_uom,
      pricing_unit_qty: new Prisma.Decimal(pricing_unit_qty ?? 1),
      cost_price: new Prisma.Decimal(cost_price ?? 0),
      retail_price: new Prisma.Decimal(retail_price),
      wholesale_price:
        wholesale_price !== undefined
          ? new Prisma.Decimal(wholesale_price)
          : null,
      category: { connect: { id: categoryId } },
      ...(binId ? { bin_location: { connect: { id: binId } } } : {}),
    };

    // 6. Save product entity
    const newProduct = await this.prisma.product.create({
      data: productData,
      include: {
        category: true,
        bin_location: true,
      },
    });

    this.logger.log(
      `Successfully created Product #${newProduct.id} ("${newProduct.name}") by User #${userId}`,
    );

    return ProductResponseDto.fromEntity(newProduct);
  }

  /**
   * Update an existing Product by ID
   */
  async updateProduct(
    productId: number,
    userId: number,
    updateDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    this.logger.log(
      `User #${userId} initiating update for Product #${productId}`,
    );

    // 1. Verify existence of target Product
    const existingProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, bin_location: true },
    });

    if (!existingProduct) {
      this.logger.warn(`Update failed: Product #${productId} not found.`);
      throw new NotFoundException(
        `Product with ID #${productId} does not exist.`,
      );
    }

    const {
      sku,
      name,
      categoryId,
      size_dimensions,
      thread_type,
      material_grade,
      base_uom,
      reorder_point_ROP,
      pricing_uom,
      pricing_unit_qty,
      cost_price,
      retail_price,
      wholesale_price,
      binId,
      needsRecount,
      allowDuplicate,
      confirmUomChange,
    } = updateDto;

    // 2. Validate Category relation (if changing category)
    let targetCategory = existingProduct.category;
    if (categoryId && categoryId !== existingProduct.categoryId) {
      const categoryExists = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!categoryExists) {
        this.logger.warn(
          `Update failed: Category #${categoryId} does not exist.`,
        );
        throw new NotFoundException(
          `Category with ID #${categoryId} does not exist.`,
        );
      }
      targetCategory = categoryExists;
    }

    // 3. Validate BinLocation relation (if changing bin)
    if (
      binId !== undefined &&
      binId !== null &&
      binId !== existingProduct.binId
    ) {
      const binExists = await this.prisma.binLocation.findUnique({
        where: { id: binId },
      });

      if (!binExists) {
        this.logger.warn(
          `Update failed: BinLocation #${binId} does not exist.`,
        );
        throw new NotFoundException(
          `BinLocation with ID #${binId} does not exist.`,
        );
      }
    }

    // 4. Handle UOM Changes & Stock Recount Guard
    let recountFlag = needsRecount ?? existingProduct.needsRecount;

    if (base_uom && base_uom !== existingProduct.base_uom) {
      if (!confirmUomChange) {
        this.logger.warn(
          `Update blocked: Attempted base_uom change on Product #${productId} without confirmation flag.`,
        );
        throw new UomChangeRequiredException(
          existingProduct.base_uom,
          base_uom,
        );
      }

      recountFlag = true;
      this.logger.warn(
        `User #${userId} changed base_uom for Product #${productId} (${existingProduct.base_uom} -> ${base_uom}). Flagged needsRecount=true.`,
      );
    }

    // UOM Mismatch Guard: Warn if pricing_uom is provided without a multiplier
    const targetBaseUom = base_uom ?? existingProduct.base_uom;
    const targetPricingUom = pricing_uom ?? existingProduct.pricing_uom;
    const targetPricingQty =
      pricing_unit_qty ?? existingProduct.pricing_unit_qty.toNumber();

    if (targetBaseUom === targetPricingUom && targetPricingQty !== 1) {
      this.logger.warn(
        `UOM Warning: Base and Pricing UOM match (${targetBaseUom}) but pricing_unit_qty is ${targetPricingQty}. Defaulting logic to 1.`,
      );
    }

    // 5. SKU Resolution & Duplicate Check
    let finalSku: string | null | undefined = sku;

    // If client sends empty string, trigger auto-generation using target attributes
    if (sku !== undefined && sku.trim() === '') {
      const targetSize = size_dimensions ?? existingProduct.size_dimensions;
      const targetThread = thread_type ?? existingProduct.thread_type;
      const targetMat = material_grade ?? existingProduct.material_grade;

      finalSku = this.generateAutoSku(
        targetCategory.name,
        targetSize,
        targetThread,
        targetMat,
      );
      this.logger.log(`SKU cleared. Generated new auto SKU: "${finalSku}"`);
    }

    // Check SKU collision against other products
    if (finalSku && finalSku !== existingProduct.sku) {
      const skuCollision = await this.prisma.product.findUnique({
        where: { sku: finalSku },
      });

      if (skuCollision) {
        this.logger.warn(
          `Update blocked: SKU "${finalSku}" is in use by Product #${skuCollision.id}`,
        );
        throw new DuplicateProductException(
          {
            id: skuCollision.id,
            sku: skuCollision.sku,
            name: skuCollision.name,
          },
          'SKU',
        );
      }
    }

    // 6. Soft Duplicate Fastener Attribute Check
    const targetSize =
      size_dimensions !== undefined
        ? size_dimensions
        : existingProduct.size_dimensions;
    const targetThread =
      thread_type !== undefined ? thread_type : existingProduct.thread_type;
    const targetMat =
      material_grade !== undefined
        ? material_grade
        : existingProduct.material_grade;
    const targetCategoryId = categoryId ?? existingProduct.categoryId;

    const hasFastenerSpecs = targetSize && targetThread && targetMat;

    if (hasFastenerSpecs && !allowDuplicate) {
      const duplicateSpecProduct = await this.prisma.product.findFirst({
        where: {
          id: { not: productId },
          categoryId: targetCategoryId,
          size_dimensions: { equals: targetSize, mode: 'insensitive' },
          thread_type: { equals: targetThread, mode: 'insensitive' },
          material_grade: { equals: targetMat, mode: 'insensitive' },
        },
      });

      if (duplicateSpecProduct) {
        this.logger.warn(
          `Update blocked: Identical fastener spec collision with Product #${duplicateSpecProduct.id}`,
        );
        throw new DuplicateProductException(
          {
            id: duplicateSpecProduct.id,
            sku: duplicateSpecProduct.sku,
            name: duplicateSpecProduct.name,
          },
          'ATTRIBUTES',
        );
      }
    }

    // 7. Execute Prisma Update
    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(name !== undefined && { name }),
        ...(finalSku !== undefined && { sku: finalSku }),
        ...(size_dimensions !== undefined && { size_dimensions }),
        ...(thread_type !== undefined && { thread_type }),
        ...(material_grade !== undefined && { material_grade }),
        ...(base_uom !== undefined && { base_uom }),
        ...(reorder_point_ROP !== undefined && {
          reorder_point_ROP: new Prisma.Decimal(reorder_point_ROP),
        }),
        ...(pricing_uom !== undefined && { pricing_uom }),
        ...(pricing_unit_qty !== undefined && {
          pricing_unit_qty: new Prisma.Decimal(pricing_unit_qty),
        }),
        ...(cost_price !== undefined && {
          cost_price: new Prisma.Decimal(cost_price),
        }),
        ...(retail_price !== undefined && {
          retail_price: new Prisma.Decimal(retail_price),
        }),
        ...(wholesale_price !== undefined && {
          wholesale_price:
            wholesale_price !== null
              ? new Prisma.Decimal(wholesale_price)
              : null,
        }),
        needsRecount: recountFlag,
        ...(categoryId && { category: { connect: { id: categoryId } } }),
        ...(binId !== undefined && {
          bin_location: binId
            ? { connect: { id: binId } }
            : { disconnect: true },
        }),
      },
      include: {
        category: true,
        bin_location: true,
      },
    });

    this.logger.log(
      `Successfully updated Product #${updatedProduct.id} ("${updatedProduct.name}") by User #${userId}`,
    );

    return ProductResponseDto.fromEntity(updatedProduct);
  }

  /**
   * Delete a Product by ID with transaction safety checks
   */
  async deleteProduct(
    productId: number,
    userId: number,
    queryDto: DeleteProductQueryDto,
  ): Promise<DeleteProductResponseDto> {
    const { forceHardDelete } = queryDto;

    this.logger.log(
      `User #${userId} requested deletion of Product #${productId} (Force Hard Delete: ${forceHardDelete})`,
    );

    // 1. Verify product existence
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        _count: {
          select: {
            transactionItems: true,
            stockMovements: true,
            poItems: true,
            deliveryItems: true,
            returns: true,
            exchanges: true,
          },
        },
      },
    });

    if (!product) {
      this.logger.warn(`Delete failed: Product #${productId} does not exist.`);
      throw new NotFoundException(
        `Product with ID #${productId} does not exist.`,
      );
    }

    // 2. Check for relational ledger/transaction items
    const historyCounts = product._count;
    const totalHistoryRecords =
      historyCounts.transactionItems +
      historyCounts.stockMovements +
      historyCounts.poItems +
      historyCounts.deliveryItems +
      historyCounts.returns +
      historyCounts.exchanges;

    if (totalHistoryRecords > 0) {
      this.logger.warn(
        `Delete blocked: Product #${productId} ("${product.name}") has ${totalHistoryRecords} linked history records.`,
      );
      throw new ProductHasHistoryException(productId, historyCounts);
    }

    // 3. Execute Hard Delete (Safe because zero history exists)
    await this.prisma.product.delete({
      where: { id: productId },
    });

    this.logger.log(
      `Successfully deleted Product #${productId} ("${product.name}") by User #${userId}`,
    );

    return {
      success: true,
      productId: product.id,
      productName: product.name,
      message: `Product #${productId} ("${product.name}") was permanently deleted.`,
    };
  }
}
