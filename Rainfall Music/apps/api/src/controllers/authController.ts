import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@rainfall/config';
import { prisma } from '@rainfall/database';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  public static getLoginUrl(req: Request, res: Response): void {
    const redirectUri = encodeURIComponent(`${config.NEXTAUTH_URL}/api/auth/callback/discord`);
    const scope = encodeURIComponent('identify guilds');
    const url = `https://discord.com/api/oauth2/authorize?client_id=${config.DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    res.json({ url });
  }

  public static async handleCallback(req: Request, res: Response): Promise<void> {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Authorization code is required' });
      return;
    }

    try {
      const redirectUri = `${config.NEXTAUTH_URL}/api/auth/callback/discord`;

      // Exchange code with Discord OAuth2 endpoint
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.DISCORD_CLIENT_ID,
          client_secret: config.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        res.status(400).json({ error: 'Failed to exchange authorization code with Discord', details: errorText });
        return;
      }

      const tokens: any = await tokenResponse.json();

      // Fetch user profile
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userData: any = await userRes.json();

      // Fetch user guilds
      const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const guildsData: any = await guildsRes.json();

      // Filter guilds where user has MANAGE_GUILD (0x20) or ADMINISTRATOR (0x8)
      const manageableGuilds = Array.isArray(guildsData)
        ? guildsData
            .filter((g: any) => {
              const perms = BigInt(g.permissions);
              return (perms & 0x20n) === 0x20n || (perms & 0x8n) === 0x8n || g.owner;
            })
            .map((g: any) => ({
              id: g.id,
              name: g.name,
              icon: g.icon,
              permissions: g.permissions,
            }))
        : [];

      // Upsert User in database
      await prisma.user.upsert({
        where: { id: userData.id },
        update: {
          username: userData.username,
          avatar: userData.avatar,
        },
        create: {
          id: userData.id,
          username: userData.username,
          avatar: userData.avatar,
        },
      });

      // Issue signed JWT
      const tokenPayload = {
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar,
        guilds: manageableGuilds,
      };

      const sessionToken = jwt.sign(tokenPayload, config.JWT_SECRET, { expiresIn: '7d' });

      res.json({
        token: sessionToken,
        user: tokenPayload,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Internal OAuth exchange failure', message: (err as Error).message });
    }
  }

  public static getMe(req: AuthenticatedRequest, res: Response): void {
    res.json({ user: req.user });
  }
}

