import bcrypt from 'bcryptjs';
import axios from 'axios';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { ApplicationException } from '../../common/errors/application-exception';

export const authService = {
  /**
   * @description Create a new local-auth user if email is not already registered.
   * @input name: string, email: string, password: string
   * @returns Created user object.
   */
  async register(name: string, email: string, password: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApplicationException('Email already registered', 409, 'EMAIL_ALREADY_REGISTERED');
    }

    const hashed = await bcrypt.hash(password, 10);
    return prisma.user.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  },

  /**
   * @description Validate local-auth credentials and return normalized user payload.
   * @input email: string, password: string
   * @returns User object on success.
   */
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new ApplicationException('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new ApplicationException('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    return { id: user.id, name: user.name, email: user.email, avatar: user.avatar };
  },

  /**
   * @description Get authenticated user profile by ID.
   * @input userId: string
   * @returns User profile.
   */
  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatar: true, createdAt: true },
    });

    if (!user) throw new ApplicationException('User not found', 404, 'USER_NOT_FOUND');
    return user;
  },

  /**
   * @description Resolve a Google profile from access token and upsert user.
   * @input accessToken: string
   * @returns User payload.
   */
  async google(accessToken: string) {
    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { email, name, picture } = profile as { email?: string; name?: string; picture?: string };
    if (!email) throw new ApplicationException('Could not get email from Google', 400, 'GOOGLE_EMAIL_NOT_FOUND');

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { name: name || email, email, password: '', avatar: picture || null } });
    } else if (!user.avatar && picture) {
      user = await prisma.user.update({ where: { id: user.id }, data: { avatar: picture } });
    }

    return { id: user.id, name: user.name, email: user.email, avatar: user.avatar };
  },

  /**
   * @description Exchange GitHub OAuth code, resolve profile email, and upsert user.
   * @input code: string
   * @returns User payload.
   */
  async github(code: string) {
    if (!env.githubClientId || !env.githubClientSecret) {
      throw new ApplicationException('GitHub OAuth not configured', 400, 'GITHUB_OAUTH_NOT_CONFIGURED');
    }

    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      { client_id: env.githubClientId, client_secret: env.githubClientSecret, code },
      { headers: { Accept: 'application/json' } },
    );

    const ghToken = tokenRes.data?.access_token as string | undefined;
    if (!ghToken) throw new ApplicationException('GitHub token exchange failed', 401, 'GITHUB_TOKEN_EXCHANGE_FAILED');

    const { data: ghUser } = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${ghToken}` },
    });

    let email = ghUser.email as string | null;
    if (!email) {
      const { data: emails } = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `token ${ghToken}` },
      });
      email = (emails as Array<{ primary: boolean; verified: boolean; email: string }>).find((entry) => entry.primary && entry.verified)?.email || null;
    }

    if (!email) throw new ApplicationException('Could not get email from GitHub', 400, 'GITHUB_EMAIL_NOT_FOUND');

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: ghUser.name || ghUser.login || email,
          email,
          password: '',
          avatar: ghUser.avatar_url || null,
        },
      });
    }

    return { id: user.id, name: user.name, email: user.email, avatar: user.avatar };
  },
};
