# API Documentation

Patterns for documenting REST API endpoints using OpenAPI in ASP.NET Core Minimal APIs.

---

## OpenAPI Attributes

Use these attributes on all endpoints:

```csharp
endpoints.MapGet("/customers", GetCustomers)
    .WithTags("CRM")
    .WithSummary("Returns all customers")
    .WithDescription("""
        Returns a paginated list of customers for the current tenant.
        
        Supports filtering by:
        - Status (active, inactive, all)
        - Seller ID
        - Search term (matches name or matchcode)
        """)
    .Produces<GetCustomersResponse>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status401Unauthorized)
    .ProducesProblem(StatusCodes.Status403Forbidden);

endpoints.MapPost("/customers", CreateCustomer)
    .WithTags("CRM")
    .WithSummary("Creates a new customer")
    .WithDescription("Creates a new customer in the current tenant's context.")
    .Accepts<CreateCustomerRequest>("application/json")
    .Produces<CreateCustomerResponse>(StatusCodes.Status201Created)
    .ProducesValidationProblem();

endpoints.MapGet("/customers/{id}", GetCustomerById)
    .WithTags("CRM")
    .WithSummary("Returns a customer by ID")
    .Produces<CustomerDto>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status404NotFound);

endpoints.MapDelete("/customers/{id}", DeleteCustomer)
    .WithTags("CRM")
    .WithSummary("Deletes a customer")
    .WithDescription("Soft-deletes the customer. Can be restored within 30 days.")
    .Produces(StatusCodes.Status204NoContent)
    .ProducesProblem(StatusCodes.Status404NotFound)
    .ProducesProblem(StatusCodes.Status409Conflict);
```

---

## Required Attributes

| Attribute | Required | Purpose |
|-----------|----------|---------|
| `WithTags()` | ✅ | Groups endpoints in Swagger UI |
| `WithSummary()` | ✅ | Short one-line description |
| `WithDescription()` | ⚠️ | Detailed explanation (if complex) |
| `Produces<T>()` | ✅ | Success response type |
| `ProducesProblem()` | ✅ | Error responses |
| `Accepts<T>()` | ✅ | Request body type (POST/PUT) |
| `ProducesValidationProblem()` | ✅ | For endpoints with validation |

---

## Tags Convention

Use module name as tag:

| Module | Tag |
|--------|-----|
| CRM | `"CRM"` |
| Sales | `"Sales"` |
| Inventory | `"Inventory"` |
| Auth | `"Authentication"` |

---

## Request/Response Documentation

### DTOs with XML Comments

For records with primary constructors, use `<param name="">` tags:

```csharp
/// <summary>
/// Request to create a new customer.
/// </summary>
/// <param name="MatchCode">Unique short identifier (3-10 uppercase characters).</param>
/// <param name="Name">Full legal name of the customer.</param>
/// <param name="Email">Primary contact email address.</param>
public record CreateCustomerRequest(
    [property: Required]
    [property: StringLength(10, MinimumLength = 3)]
    string MatchCode,
    
    [property: Required]
    [property: StringLength(200)]
    string Name,
    
    [property: EmailAddress]
    string? Email = null
);

/// <summary>
/// Response after successfully creating a customer.
/// </summary>
/// <param name="Customer">The created customer data.</param>
public record CreateCustomerResponse(CustomerDto Customer);

/// <summary>
/// Customer data transfer object.
/// </summary>
/// <param name="Id">Unique identifier.</param>
/// <param name="MatchCode">Short lookup code.</param>
/// <param name="Name">Full company name.</param>
/// <param name="Status">Current customer status.</param>
public record CustomerDto(
    Guid Id,
    string MatchCode,
    string Name,
    CustomerStatus Status
);
```

**Note:** Use `[property: Attribute]` syntax to apply attributes to the generated property, not the constructor parameter.

---

## Error Responses (Problem Details)

Use RFC 7807 Problem Details:

```csharp
// In endpoint handler
if (customer is null)
{
    return Results.Problem(
        title: "Customer not found",
        detail: $"No customer with ID '{id}' exists.",
        statusCode: StatusCodes.Status404NotFound,
        type: "https://docs.metsoft.cloud/errors/customer-not-found"
    );
}

// Validation errors
if (!validationResult.IsValid)
{
    return Results.ValidationProblem(
        validationResult.ToDictionary(),
        title: "Validation failed",
        detail: "One or more fields have invalid values."
    );
}

// Conflict
if (await repository.ExistsAsync(request.MatchCode))
{
    return Results.Problem(
        title: "Duplicate matchcode",
        detail: $"A customer with matchcode '{request.MatchCode}' already exists.",
        statusCode: StatusCodes.Status409Conflict
    );
}
```

---

## Swagger UI Configuration

```csharp
// In Program.cs
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, ct) =>
    {
        document.Info = new OpenApiInfo
        {
            Title = "Metsoft Cloud API",
            Version = "v1",
            Description = "ERP System API for Atlas Blech Center",
            Contact = new OpenApiContact
            {
                Name = "Development Team",
                Email = "dev@atlasblech.at"
            }
        };
        return Task.CompletedTask;
    });
});

// Enable Swagger UI
app.MapOpenApi();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "Metsoft Cloud API v1");
});
```

---

## API Versioning Documentation

```csharp
// Version in route
endpoints.MapGet("/api/v1/customers", GetCustomersV1);
endpoints.MapGet("/api/v2/customers", GetCustomersV2);

// Document breaking changes
.WithDescription("""
    **v2 Breaking Changes:**
    - `customerNumber` renamed to `matchCode`
    - `address` is now an array of `addresses`
    """);
```

---

## Examples in OpenAPI

```csharp
/// <summary>
/// Creates a new order.
/// </summary>
/// <example>
/// POST /api/sales/orders
/// {
///   "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
///   "lines": [
///     { "productId": "...", "quantity": 5, "unitPrice": 19.99 }
///   ]
/// }
/// </example>
```
