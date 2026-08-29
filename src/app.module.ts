import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StaffUserModule } from './staff-user/staff-user.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { InventoryModule } from './inventory/inventory.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ProductsModule } from './products/products.module';
import { BinLocationModule } from './bin-location/bin-location.module';
import { PosModule } from './pos/pos.module';
import { CustomersModule } from './customers/customers.module';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>(
          'REDIS_URL',
          'redis://localhost:6379',
        );

        return {
          stores: [new KeyvRedis(redisUrl)],
        };
      },
    }),
    PrismaModule,
    AuthModule,
    StaffUserModule,
    InventoryModule,
    ProductsModule,
    BinLocationModule,
    PosModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
