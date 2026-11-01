import { Collection } from 'discord.js';
import { CommandContext } from '../commands/CommandContext';
import { BaseCommand } from '../commands/BaseCommand';
import type { RainfallClient } from '../client/RainfallClient';
import { MiddlewareResult } from './voiceCheck';

export function checkCooldown(
  ctx: CommandContext,
  cmd: BaseCommand,
  client: RainfallClient
): MiddlewareResult {
  // Developer bypass
  if (client.config.DEVELOPER_USER_IDS.includes(ctx.author.id)) {
    return { passed: true };
  }

  if (!client.cooldowns.has(cmd.name)) {
    client.cooldowns.set(cmd.name, new Collection());
  }

  const now = Date.now();
  const timestamps = client.cooldowns.get(cmd.name)!;
  const cooldownAmount = (cmd.cooldown || 3) * 1000;

  if (timestamps.has(ctx.author.id)) {
    const expirationTime = timestamps.get(ctx.author.id)! + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
      return {
        passed: false,
        message: `Please wait ${timeLeft} more second(s) before reusing the \`${cmd.name}\` command.`,
      };
    }
  }

  timestamps.set(ctx.author.id, now);
  setTimeout(() => timestamps.delete(ctx.author.id), cooldownAmount);

  return { passed: true };
}

