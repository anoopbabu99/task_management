import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiService {
  private anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });

  async askClaude(prompt: string) {
    const msg = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    
    return msg.content;
  }
}