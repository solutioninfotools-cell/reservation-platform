import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssistantService } from './assistant.service';

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private assistant: AssistantService) {}

  @Post('ask')
  ask(@Body('question') question: string, @Body('professionnelId') professionnelId?: string) {
    return this.assistant.answer(question, professionnelId);
  }
}
