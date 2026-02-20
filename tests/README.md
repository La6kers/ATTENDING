# ATTENDING AI - Testing Strategy

## Test Layers

| Layer | Tool | Location | Command |
|-------|------|----------|---------|
| **Unit** | Vitest | `apps/*/__tests__/` | `npm test` |
| **Integration** | Vitest + node-mocks-http | `tests/integration/` | `npm run test:integration` |
| **E2E** | Playwright | `apps/provider-portal/e2e/` | `npm run test:e2e` |

## Running Tests

```bash
npm test              # Watch mode (all unit + integration)
npm run test:run      # Single run
npm run test:integration  # Integration tests only
npm run test:coverage # With coverage report
npm run test:e2e      # Playwright E2E (requires running app)
npm run test:all      # Unit + Integration + E2E
```

## Test Helpers (`tests/helpers/`)

### API Route Testing

```typescript
import { apiTest, mockSession, expectSuccess } from '@test/helpers';

it('creates a lab order', async () => {
  const result = await apiTest(handler, {
    method: 'POST',
    body: { encounterId: '123', tests: [...] },
    session: mockSession.provider(),
  });
  expectSuccess(result, 201);
});
```

### Mock Sessions

```typescript
mockSession.provider()   // Physician with full clinical permissions
mockSession.admin()      // Admin with all permissions
mockSession.nurse()      // RN with limited permissions
mockSession.staff()      // Front desk with minimal permissions
mockSession.expired()    // Expired session (triggers 401)
```

### Fixtures

```typescript
import { fixtures } from '@test/helpers';

const patient = fixtures.patient({ lastName: 'Smith' });
const encounter = fixtures.encounter({ patientId: patient.id });
const vitals = fixtures.criticalVitals({ encounterId: encounter.id });
```

### Standard Assertions

```typescript
expectSuccess(result)              // 200 + success: true
expectSuccess(result, 201)         // 201 + success: true
expectError(result, 400)           // 400 status
expectError(result, 404, 'NOT_FOUND')  // 404 + specific error code
expectRateLimitHeaders(result)     // X-RateLimit-* headers present
```

## Conventions

- **File naming**: `*.test.ts` for Vitest, `*.spec.ts` for Playwright
- **Test IDs**: All fixture IDs start with `test-` prefix for easy cleanup
- **Database tests**: Set `TEST_DATABASE_URL` env var; tests skip DB cleanup if unset
- **Auth mocking**: Use `mockAuth(session)` or pass `session` to `apiTest()`
- **Middleware composition**: Test the full stack (rate limit → validation → auth → handler)
