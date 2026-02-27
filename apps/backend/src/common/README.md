# Multi-Tenant Foundation

## Usage

### Tenant Middleware
Automatically extracts `tenantId` from JWT and attaches to request.
Applied globally in `AppModule`.

**Note:** Must be applied AFTER JWT authentication middleware.

### Tenant Guard
Ensures `tenantId` exists in request context.

```typescript
@UseGuards(TenantGuard)
@Get('campaigns')
getCampaigns() {
  // request.tenantId is available
}
```

### Role Guard
Checks user role against allowed roles.

```typescript
@UseGuards(RoleGuard)
@Roles(Role.TENANT_OWNER, Role.MEMBER)
@Get('users')
getUsers() {
  // Only TENANT_OWNER or MEMBER can access
}
```

### Combined Usage

```typescript
@UseGuards(TenantGuard, RoleGuard)
@Roles(Role.TENANT_OWNER)
@Post('campaigns')
createCampaign() {
  // request.tenantId and request.user are available
  // Only TENANT_OWNER can access
}
```

### Request Type

Use `TenantRequest` for typed access:

```typescript
import { TenantRequest } from '../common/types/request.types';

@Get('data')
getData(@Req() req: TenantRequest) {
  const tenantId = req.tenantId;
  const user = req.user;
}
```
