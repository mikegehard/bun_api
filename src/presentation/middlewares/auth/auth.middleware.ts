import { Elysia } from 'elysia';
import { authPlugin } from './auth.plugin';
import type { AuthUser } from '@/shared/types/auth.types';

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .use(authPlugin) // 👈 ESSENCIAL
  .decorate('user', null as AuthUser | null)
  .onBeforeHandle(async ({ request, jwt, set, store }) => {
    const authHeader = request.headers.get('authorization');

    console.log('NÃO ESTÁ SENDO CHAMADO');

    if (!authHeader) {
      set.status = 401;
      return 'Token não informado';
    }

    const token = authHeader.replace('Bearer ', '');

    const payload = await jwt.verify(token);

    //console.log('payload', payload);

    if (!payload) {
      set.status = 401;
      return 'Token inválido';
    }

    // Map JWT payload to AuthUser
    store.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
    } as AuthUser;
  });
