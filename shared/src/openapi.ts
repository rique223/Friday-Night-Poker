import { z } from 'zod';

import * as s from './schemas.js';

/**
 * The OpenAPI document is *generated from the zod schemas* rather than hand-written,
 * so it cannot drift from what the server actually validates (Q42/Q75).
 *
 * Run `yarn openapi` to refresh `shared/openapi.json`; the server also serves the
 * live document at `GET /api/openapi.json`.
 */

const registry: Record<string, z.ZodType> = {
    ApiError: s.ApiError,
    AuthUser: s.AuthUser,
    LoginBody: s.LoginBody,
    BuyInEntry: s.BuyInEntry,
    CreditEntry: s.CreditEntry,
    Player: s.Player,
    SessionSummary: s.SessionSummary,
    SessionDetail: s.SessionDetail,
    SessionGroup: s.SessionGroup,
    SessionGroupPage: s.SessionGroupPage,
    CreateSessionBody: s.CreateSessionBody,
    UpdateSessionBody: s.UpdateSessionBody,
    AddPlayerBody: s.AddPlayerBody,
    BuyInBody: s.BuyInBody,
    CreditBody: s.CreditBody,
    UpdateAmountBody: s.UpdateAmountBody,
    CashOutBody: s.CashOutBody,
    CreatedSession: s.CreatedSession,
    CreatedPlayer: s.CreatedPlayer,
    CreatedEntry: s.CreatedEntry,
    CreatedCredit: s.CreatedCredit,
    CashOutResult: s.CashOutResult,
    HealthResult: s.HealthResult,
};

const ref = (name: keyof typeof registry) => ({ $ref: `#/components/schemas/${name}` });

/** Wraps a component in the `{ success: true, data }` envelope used by every 2xx body. */
const ok = (description: string, schema?: keyof typeof registry) => ({
    description,
    content: {
        'application/json': {
            schema: {
                type: 'object',
                required: ['success', ...(schema ? ['data'] : [])],
                properties: {
                    success: { type: 'boolean', enum: [true] },
                    ...(schema ? { data: ref(schema) } : {}),
                },
            },
        },
    },
});

const fail = (description: string) => ({
    description,
    content: { 'application/json': { schema: ref('ApiError') } },
});

const errors = {
    400: fail('Validation failed or the action is not legal in the current state'),
    401: fail('Not authenticated'),
    404: fail('Resource not found'),
    409: fail('Conflicts with the current state of the resource'),
    429: fail('Rate limited'),
};

const jsonBody = (schema: keyof typeof registry) => ({
    required: true,
    content: { 'application/json': { schema: ref(schema) } },
});

const sessionIdParam = {
    name: 'sessionId',
    in: 'path',
    required: true,
    schema: { type: 'integer', minimum: 1 },
};
const playerIdParam = {
    name: 'playerId',
    in: 'path',
    required: true,
    schema: { type: 'integer', minimum: 1 },
};
const entryIdParam = {
    name: 'entryId',
    in: 'path',
    required: true,
    schema: { type: 'string' },
};

function listSessionsParameters() {
    const shape = s.ListSessionsQuery.shape;
    return Object.entries(shape).map(([name, schema]) => ({
        name,
        in: 'query',
        required: false,
        schema: z.toJSONSchema(schema as z.ZodType, {
            target: 'openapi-3.0',
            unrepresentable: 'any',
        }),
    }));
}

export function buildOpenApiDocument() {
    const schemas: Record<string, unknown> = {};
    for (const [name, schema] of Object.entries(registry)) {
        schemas[name] = z.toJSONSchema(schema, {
            target: 'openapi-3.0',
            unrepresentable: 'any',
            io: 'output',
        });
    }

    return {
        openapi: '3.0.3',
        info: {
            title: 'Friday Night Poker API',
            version: '1.0.0',
            description:
                'Bookkeeping for a home poker game. All monetary values are **integer cents** ' +
                'and all timestamps are ISO-8601 UTC with a `Z` suffix.',
        },
        servers: [{ url: '/api' }],
        components: {
            schemas,
            securitySchemes: {
                sessionCookie: { type: 'apiKey', in: 'cookie', name: 'session' },
            },
        },
        security: [{ sessionCookie: [] }],
        paths: {
            '/health': {
                get: {
                    summary: 'Liveness and database check',
                    security: [],
                    tags: ['meta'],
                    responses: { 200: ok('Service status', 'HealthResult'), 503: errors[400] },
                },
            },
            '/auth/login': {
                post: {
                    summary: 'Exchange credentials for a session cookie',
                    security: [],
                    tags: ['auth'],
                    requestBody: jsonBody('LoginBody'),
                    responses: {
                        200: ok('Authenticated', 'AuthUser'),
                        400: errors[400],
                        401: errors[401],
                        429: errors[429],
                    },
                },
            },
            '/auth/logout': {
                post: {
                    summary: 'Clear the session cookie',
                    tags: ['auth'],
                    responses: { 200: ok('Logged out'), 401: errors[401] },
                },
            },
            '/auth/me': {
                get: {
                    summary: 'Current user',
                    tags: ['auth'],
                    responses: { 200: ok('Current user', 'AuthUser'), 401: errors[401] },
                },
            },
            '/sessions': {
                get: {
                    summary: 'List sessions, grouped and paginated by group',
                    tags: ['sessions'],
                    parameters: listSessionsParameters(),
                    responses: {
                        200: ok('A page of session groups', 'SessionGroupPage'),
                        400: errors[400],
                        401: errors[401],
                    },
                },
                post: {
                    summary: 'Create a session',
                    tags: ['sessions'],
                    requestBody: jsonBody('CreateSessionBody'),
                    responses: {
                        201: ok('Created', 'CreatedSession'),
                        400: errors[400],
                        401: errors[401],
                    },
                },
            },
            '/sessions/{sessionId}': {
                parameters: [sessionIdParam],
                get: {
                    summary: 'Session with all players and their movements',
                    tags: ['sessions'],
                    responses: {
                        200: ok('Session detail', 'SessionDetail'),
                        401: errors[401],
                        404: errors[404],
                    },
                },
                patch: {
                    summary: 'Move the session through its lifecycle (open → ended → archived)',
                    tags: ['sessions'],
                    requestBody: jsonBody('UpdateSessionBody'),
                    responses: {
                        200: ok('Updated session', 'SessionSummary'),
                        400: errors[400],
                        401: errors[401],
                        404: errors[404],
                        409: errors[409],
                    },
                },
            },
            '/sessions/{sessionId}/players': {
                parameters: [sessionIdParam],
                post: {
                    summary: 'Add a player with their initial buy-in',
                    tags: ['players'],
                    requestBody: jsonBody('AddPlayerBody'),
                    responses: {
                        201: ok('Created', 'CreatedPlayer'),
                        400: errors[400],
                        401: errors[401],
                        404: errors[404],
                    },
                },
            },
            '/sessions/{sessionId}/players/{playerId}': {
                parameters: [sessionIdParam, playerIdParam],
                delete: {
                    summary: 'Remove a player added by mistake',
                    description:
                        'Only permitted while the player has no movements beyond their initial buy-in.',
                    tags: ['players'],
                    responses: {
                        204: { description: 'Removed' },
                        401: errors[401],
                        404: errors[404],
                        409: errors[409],
                    },
                },
            },
            '/sessions/{sessionId}/buy-ins': {
                parameters: [sessionIdParam],
                post: {
                    summary: 'Register a buy-in',
                    tags: ['movements'],
                    requestBody: jsonBody('BuyInBody'),
                    responses: {
                        201: ok('Created', 'CreatedEntry'),
                        400: errors[400],
                        401: errors[401],
                        404: errors[404],
                    },
                },
            },
            '/sessions/{sessionId}/buy-ins/{entryId}': {
                parameters: [sessionIdParam, entryIdParam],
                patch: {
                    summary: 'Correct the amount of a buy-in',
                    tags: ['movements'],
                    requestBody: jsonBody('UpdateAmountBody'),
                    responses: {
                        200: ok('Updated'),
                        400: errors[400],
                        401: errors[401],
                        404: errors[404],
                    },
                },
                delete: {
                    summary: 'Undo a buy-in',
                    tags: ['movements'],
                    responses: {
                        204: { description: 'Deleted' },
                        401: errors[401],
                        404: errors[404],
                        409: errors[409],
                    },
                },
            },
            '/sessions/{sessionId}/credits': {
                parameters: [sessionIdParam],
                post: {
                    summary: 'Register chips lent from one player to another',
                    tags: ['movements'],
                    requestBody: jsonBody('CreditBody'),
                    responses: {
                        201: ok('Created', 'CreatedCredit'),
                        400: errors[400],
                        401: errors[401],
                        404: errors[404],
                    },
                },
            },
            '/sessions/{sessionId}/credits/{entryId}': {
                parameters: [sessionIdParam, entryIdParam],
                patch: {
                    summary: 'Correct the amount of a credit, on both sides',
                    tags: ['movements'],
                    requestBody: jsonBody('UpdateAmountBody'),
                    responses: {
                        200: ok('Updated'),
                        400: errors[400],
                        401: errors[401],
                        404: errors[404],
                    },
                },
                delete: {
                    summary: 'Undo a credit, on both sides',
                    tags: ['movements'],
                    responses: {
                        204: { description: 'Deleted' },
                        401: errors[401],
                        404: errors[404],
                        409: errors[409],
                    },
                },
            },
            '/sessions/{sessionId}/cash-outs': {
                parameters: [sessionIdParam],
                post: {
                    summary: 'Cash a player out with their final chip count',
                    tags: ['movements'],
                    requestBody: jsonBody('CashOutBody'),
                    responses: {
                        200: ok('Payout', 'CashOutResult'),
                        400: errors[400],
                        401: errors[401],
                        404: errors[404],
                        409: errors[409],
                    },
                },
            },
            '/sessions/{sessionId}/cash-outs/{playerId}': {
                parameters: [sessionIdParam, playerIdParam],
                delete: {
                    summary: 'Undo a cash-out and return the player to the table',
                    tags: ['movements'],
                    responses: {
                        204: { description: 'Deleted' },
                        401: errors[401],
                        404: errors[404],
                        409: errors[409],
                    },
                },
            },
        },
    };
}
