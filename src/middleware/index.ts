import { defineMiddleware } from 'astro/middleware';

export const onRequest = defineMiddleware(async (context, next)  => {
  if(context.url.pathname === '/health') {
    return next();
  }

  const authenticatedRoutes = ['/dashboard', '/admin/dashboard'];

  const token = context.cookies.get('twitch-token');
  if(!token && authenticatedRoutes.includes(context.url.pathname)) {
    return context.redirect('/');
  }

  if(token && context.url.pathname === '/') {
    return context.redirect('/dashboard');
  }

  /*
   * potential refactor if the requests to Twitch get too much
   *
   * Right now every page load, every note creation / update calls Twitch asking for the online status
   * Should Twitch tell us that this is too spammy we could implement a cache that stores the online status for a certain amount of time
   * A quick way for this would be to set cookies for the online status and when the last check was made
   * Only if the last check is older than a certain amount of time we would ask Twitch again
   */
  let isOnline = false;
  try {
    const response = await fetch('https://api.twitch.tv/helix/streams?user_login=bamboechop&type=live', {
      headers: {
        Authorization: `Bearer ${token!.value}`,
        'Client-Id': import.meta.env.PUBLIC_TWITCH_CLIENT_ID,
      },
    });
    isOnline = (await response.json())?.data?.length > 0;
  } catch (err) {
    isOnline = false;
  }
  context.locals.isOnline = !!import.meta.env.DEV_MODE || isOnline;
  return next();
});
