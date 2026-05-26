export function createRouter() {
  const routes = [];
  return {
    add(method, path, options, handler) {
      routes.push({
        method: method.toUpperCase(),
        path,
        pattern: compilePath(path),
        ...options,
        handler,
      });
    },
    match(method, pathname) {
      for (const route of routes) {
        if (route.method !== method) continue;
        const match = pathname.match(route.pattern.regex);
        if (!match) continue;
        return {
          route,
          params: Object.fromEntries(route.pattern.keys.map((key, index) => [key, match[index + 1]])),
        };
      }
      return null;
    },
  };
}

function compilePath(path) {
  const keys = [];
  const source = path.replace(/:([a-zA-Z][a-zA-Z0-9_]*)/g, (_, key) => {
    keys.push(key);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${source}$`), keys };
}
