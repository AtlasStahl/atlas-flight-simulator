# Code Documentation

Patterns for XML documentation comments and inline code documentation.

---

## Core/Shared Code Requirements

All code in shared libraries MUST be fully documented:

| Element | Required | Content |
|---------|----------|---------|
| Public classes | ✅ | Summary, remarks, example |
| Public methods | ✅ | Summary, all params, returns, exceptions |
| Public properties | ✅ | Summary |
| Interfaces | ✅ | Summary + all members |
| Records | ✅ | Summary, param for each property |
| Value Objects | ✅ | Summary, validation rules, example |
| Domain Events | ✅ | Summary, when published |
| Enums | ✅ | Summary for enum and each value |

### Projects Requiring Full Documentation

- `Metsoft.Cloud.SharedKernel`
- `Metsoft.Cloud.*.Contracts`
- `Metsoft.Cloud.*.ApiContracts`

---

## XML Documentation Comments

### Classes

```csharp
/// <summary>
/// Represents a customer in the CRM system.
/// </summary>
/// <remarks>
/// <para>
/// Customers are aggregate roots and manage their own addresses and contacts.
/// All modifications must go through the aggregate root to maintain invariants.
/// </para>
/// <para>
/// A customer must have at least one billing address before being activated.
/// </para>
/// </remarks>
/// <seealso cref="CustomerAddress"/>
/// <seealso cref="CustomerContact"/>
public class Customer : AggregateRoot<CustomerId>
{
    // ...
}
```

### Methods

```csharp
/// <summary>
/// Creates a new customer with the specified details.
/// </summary>
/// <param name="matchCode">
/// Unique short identifier (3-10 chars, uppercase).
/// Used for quick lookup and must be unique within the tenant.
/// </param>
/// <param name="name">Full legal name of the customer.</param>
/// <param name="email">Optional primary contact email address.</param>
/// <returns>A new <see cref="Customer"/> instance in draft status.</returns>
/// <exception cref="ArgumentException">
/// Thrown when <paramref name="matchCode"/> is empty, exceeds 10 characters,
/// or contains invalid characters.
/// </exception>
/// <exception cref="ArgumentNullException">
/// Thrown when <paramref name="name"/> is null or empty.
/// </exception>
/// <example>
/// <code>
/// var customer = Customer.Create("ACME", "Acme Corporation", "info@acme.com");
/// customer.AddAddress(AddressType.Billing, "Main St 1", "12345", "Vienna", "AT");
/// customer.Activate();
/// </code>
/// </example>
public static Customer Create(string matchCode, string name, string? email = null)
{
    // Implementation
}
```

### Properties

```csharp
/// <summary>
/// Gets the unique short identifier for quick customer lookup.
/// </summary>
/// <value>
/// A string of 3-10 uppercase alphanumeric characters.
/// </value>
/// <remarks>
/// The matchcode is immutable after creation and must be unique within the tenant.
/// </remarks>
public string MatchCode { get; private set; }

/// <summary>
/// Gets the customer's current status.
/// </summary>
/// <value>
/// One of <see cref="CustomerStatus.Draft"/>, <see cref="CustomerStatus.Active"/>,
/// or <see cref="CustomerStatus.Inactive"/>.
/// </value>
public CustomerStatus Status { get; private set; }
```

### Interfaces

```csharp
/// <summary>
/// Provides data access operations for customer aggregates.
/// </summary>
/// <remarks>
/// This is the command repository for write operations.
/// For read operations, use <see cref="ICustomerQueryRepository"/>.
/// </remarks>
public interface ICustomerRepository
{
    /// <summary>
    /// Retrieves a customer by its unique identifier.
    /// </summary>
    /// <param name="id">The customer's unique identifier.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>
    /// The customer if found; otherwise, <c>null</c>.
    /// </returns>
    Task<Customer?> GetByIdAsync(CustomerId id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new customer to the repository.
    /// </summary>
    /// <param name="customer">The customer to add.</param>
    /// <remarks>
    /// Changes are not persisted until <see cref="IUnitOfWork.CommitAsync"/> is called.
    /// </remarks>
    void Add(Customer customer);
}
```

---

## When to Document

| Element | Required | Content |
|---------|----------|---------|
| Public classes | ✅ | Summary, remarks, seealso |
| Public methods | ✅ | Summary, params, returns, exceptions, example |
| Public properties | ✅ | Summary, value, remarks if needed |
| Interfaces | ✅ | Summary for interface and all members |
| Records | ✅ | Summary, param for each property |
| Enums | ✅ | Summary for enum and each value |
| Internal classes | ⚠️ | If complex or non-obvious |
| Private members | ❌ | Only if complex logic |

---

## Record Documentation

For records with primary constructors, use `<param name="">` tags (not inline comments):

```csharp
/// <summary>
/// Represents a unique customer identifier.
/// </summary>
/// <param name="Value">The underlying GUID value.</param>
public readonly record struct CustomerId(Guid Value)
{
    /// <summary>
    /// Creates a new unique customer identifier.
    /// </summary>
    public static CustomerId New() => new(Guid.NewGuid());
    
    /// <summary>
    /// Represents an empty/uninitialized customer identifier.
    /// </summary>
    public static CustomerId Empty => new(Guid.Empty);
}

/// <summary>
/// Data transfer object for customer information.
/// </summary>
/// <param name="Id">Unique customer identifier.</param>
/// <param name="MatchCode">Short lookup code (3-10 characters).</param>
/// <param name="Name">Full legal company name.</param>
/// <param name="Email">Primary contact email address.</param>
/// <param name="Status">Current lifecycle status.</param>
public record CustomerDto(
    Guid Id,
    string MatchCode,
    string Name,
    string? Email,
    CustomerStatus Status
);

/// <summary>
/// Domain event published when a new customer is created.
/// </summary>
/// <param name="CustomerId">The ID of the created customer.</param>
/// <param name="MatchCode">The customer's matchcode.</param>
/// <param name="TenantId">The tenant where the customer was created.</param>
/// <param name="OccurredAt">When the event occurred.</param>
public record CustomerCreatedEvent(
    CustomerId CustomerId,
    string MatchCode,
    TenantId TenantId,
    DateTimeOffset OccurredAt
) : IDomainEvent;
```

**Key points:**
- Use `<param name="">` at the record level, not inline comments
- Document all parameters even if names are self-explanatory
- For records with attributes, use `[property: Attribute]` syntax

---

## Enum Documentation

```csharp
/// <summary>
/// Represents the lifecycle status of a customer.
/// </summary>
public enum CustomerStatus
{
    /// <summary>
    /// Customer is being created and cannot be used in transactions.
    /// </summary>
    Draft = 0,

    /// <summary>
    /// Customer is active and can be used in orders and invoices.
    /// </summary>
    Active = 1,

    /// <summary>
    /// Customer is deactivated and cannot be used in new transactions.
    /// Existing transactions remain visible.
    /// </summary>
    Inactive = 2
}
```

---

## Inline Comments

Use sparingly for **why**, not **what**:

```csharp
// ❌ Bad - describes what the code does (obvious)
// Add 1 to the counter
counter++;

// ✅ Good - explains why
// Increment first because the API uses 1-based indexing
counter++;

// ✅ Good - explains business rule
// Credit limit over 10,000 EUR requires finance approval per company policy
if (creditLimit > 10_000m)
{
    RequireFinanceApproval();
}

// ✅ Good - explains workaround
// Using reflection here because the property is internal in the library
// See: https://github.com/library/issues/123
var value = GetInternalPropertyViaReflection(obj, "InternalProp");
```

---

## TODO Comments

Use structured format with date and issue reference:

```csharp
// TODO(2026-01-15): Implement retry logic for transient failures (Issue #234)

// FIXME(2026-01-15): This breaks when customer has more than 100 addresses (Issue #567)

// HACK(2026-01-15): Temporary workaround until library v2.0 is released
//                   Remove after upgrading MudBlazor. See ADR-0045.

// PERF(2026-01-15): Consider caching this query, called ~1000x per request
```

**Format:** `// {TYPE}({YYYY-MM-DD}): {Description} ({Issue Reference})`

| Type | Purpose |
|------|---------|
| `TODO` | Feature or improvement to implement |
| `FIXME` | Known bug that needs fixing |
| `HACK` | Temporary workaround (document removal condition) |
| `PERF` | Performance improvement opportunity |

---

## Design Decision Comments

For non-obvious architectural choices:

```csharp
/// <summary>
/// Handles customer creation.
/// </summary>
/// <remarks>
/// <para>
/// <b>Design Decision:</b> We use a factory method on the entity rather than
/// a constructor to ensure all invariants are validated at creation time.
/// See ADR-0012 for rationale.
/// </para>
/// <para>
/// <b>Performance:</b> The matchcode uniqueness check is done here rather than
/// in the repository to fail fast before any database operations.
/// </para>
/// </remarks>
public class CreateCustomerHandler
{
    // ...
}
```

---

## Generating Documentation

### XML File Generation

In `.csproj`:

```xml
<PropertyGroup>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <NoWarn>$(NoWarn);CS1591</NoWarn> <!-- Suppress missing XML comment warnings -->
</PropertyGroup>
```

### DocFX Integration

For generating static documentation site:

```yaml
# docfx.json
{
  "metadata": [
    {
      "src": [
        { "src": "src", "files": ["**/*.csproj"] }
      ],
      "dest": "api"
    }
  ],
  "build": {
    "content": [
      { "files": ["api/**.yml", "api/index.md"] },
      { "files": ["docs/**.md"] }
    ],
    "dest": "_site"
  }
}
```
