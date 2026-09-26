export function createAuthGuard({
  isAuthenticated,
  isAdmin = () => false,
  loginRoute = 'Login',
  homeRoute = 'Home',
}) {
  return (to) => {
    const logged = isAuthenticated();

    if (!to.meta.public && !logged) {
      return { name: loginRoute, query: { redirect: to.fullPath } };
    }

    if (to.meta.public && logged) {
      return { name: homeRoute };
    }

    if (to.meta.admin && !isAdmin()) {
      return { name: homeRoute };
    }

    return true;
  };
}
