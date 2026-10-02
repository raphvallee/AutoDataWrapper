import {mockModule} from "../harness";

/**
 * Replaces express with a recorder, for the entrypoint test.
 *
 * index.ts binds a port the moment it is imported and never exports the
 * server, so a real app could not be shut down again - the test would leak a
 * listener and fight the dev server for port 3000. The router's own
 * behaviour is covered against real express in routes.test.ts.
 */
type Handler = (...args: unknown[]) => unknown;

const routes = new Map<string, Handler>();
const middleware: unknown[][] = [];
const listens: (string | number)[] = [];

const app = {
    use(...args: unknown[]) {
        middleware.push(args);
        return app;
    },
    get(path: string, handler: Handler) {
        routes.set(path, handler);
        return app;
    },
    listen(port: string | number, callback?: () => void) {
        listens.push(port);
        callback?.();
        return {close: () => undefined};
    },
};

mockModule("express", () => ({
    default: () => app,
    Router: () => ({get: () => undefined, use: () => undefined}),
}));

export {app, routes, middleware, listens};