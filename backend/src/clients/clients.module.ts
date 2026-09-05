import { Global, Module } from '@nestjs/common';
import { ClientsService } from './clients.service';

@Global()
@Module({
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
