export function createAuthGuard({ isAuthenticated, loginRoute = 'Login', homeRoute = 'Home' }) {
  return (to) => {
    const logged = isAuthenticated();

    if (!to.meta.public && !logged) {
      return { name: loginRoute, query: { redirect: to.fullPath } };
    }

    if (to.meta.public && logged) {
      return { name: homeRoute };
    }

    return true;
  };
}
