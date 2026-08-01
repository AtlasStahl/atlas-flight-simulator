# User Manual Documentation

Patterns for creating localized in-app help content.

---

## File Structure

```
docs/business/user-manual/
  index.md                    # German (default)
  index.en.md                 # English
  crm/
    index.md                  # Module overview
    customer-list.md          # German (default)
    customer-list.en.md       # English translation
  sales/
    index.md
    order-list.md
    order-list.en.md
```

---

## Naming Convention

| Page Component | Help File (DE) | Help File (EN) |
|----------------|----------------|----------------|
| `CustomerListPage.razor` | `crm/customer-list.md` | `crm/customer-list.en.md` |
| `OrderListPage.razor` | `sales/order-list.md` | `sales/order-list.en.md` |

**Pattern:** `{module}/{page-name-in-kebab-case}.md`

---

## Templates

### Module Overview (`index.md`)

📄 **[user-manual-module-template.md](../assets/user-manual-module-template.md)**

- Modul-Beschreibung und Zugriff
- Funktionsübersicht (Tabelle mit Links zu Seiten)
- Schnelleinstieg

### Page (`customer-list.md`)

📄 **[user-manual-page-template.md](../assets/user-manual-page-template.md)**

- Hauptbereiche mit "So geht's" und Feldtabellen
- Tipps & Tricks
- Fehlerbehebung (Problem → Ursache → Lösung)
- Änderungshistorie

---

## Localization

| File | Language | Purpose |
|------|----------|---------|
| `customer-list.md` | German | Default version |
| `customer-list.en.md` | English | Translation |

- Create German version first
- Keep files in sync when updating
- Links within same language: `[Kundendetails](customer-detail.md)`

---

## HelpViewer Component Integration

### Usage in Pages

```razor
@page "/crm/customers"
@inject IHelpService HelpService

<PageTitle>Kundenliste</PageTitle>

<MudStack Row="true" AlignItems="AlignItems.Center" Class="mb-4">
    <MudText Typo="Typo.h4">Kundenliste</MudText>
    <MudSpacer />
    <HelpButton Path="crm/customer-list" />
</MudStack>

@* Page content *@
```

### HelpButton Component

```razor
@* Components/HelpButton.razor *@
<MudIconButton Icon="@Icons.Material.Outlined.Help"
               Color="Color.Default"
               Size="Size.Small"
               OnClick="OpenHelp"
               Title="Hilfe anzeigen" />

@code {
    [Parameter, EditorRequired]
    public string Path { get; set; } = default!;

    [Inject]
    private IDialogService DialogService { get; set; } = default!;

    private async Task OpenHelp()
    {
        var parameters = new DialogParameters<HelpDialog>
        {
            { x => x.Path, Path }
        };
        
        var options = new DialogOptions
        {
            MaxWidth = MaxWidth.Medium,
            FullWidth = true,
            CloseButton = true
        };
        
        await DialogService.ShowAsync<HelpDialog>("Hilfe", parameters, options);
    }
}
```

### HelpDialog Component

```razor
@* Components/HelpDialog.razor *@
<MudDialog>
    <DialogContent>
        <MudContainer Class="pa-4">
            @if (_isLoading)
            {
                <MudProgressCircular Indeterminate="true" />
            }
            else if (_content is not null)
            {
                @((MarkupString)_content)
            }
            else
            {
                <MudAlert Severity="Severity.Info">
                    Keine Hilfe für diese Seite verfügbar.
                </MudAlert>
            }
        </MudContainer>
    </DialogContent>
</MudDialog>

@code {
    [Parameter, EditorRequired]
    public string Path { get; set; } = default!;

    [Inject]
    private IHelpService HelpService { get; set; } = default!;

    private bool _isLoading = true;
    private string? _content;

    protected override async Task OnInitializedAsync()
    {
        _content = await HelpService.GetHelpContentAsync(Path);
        _isLoading = false;
    }
}
```

### IHelpService Interface

```csharp
/// <summary>
/// Provides access to user manual content.
/// </summary>
public interface IHelpService
{
    /// <summary>
    /// Gets the HTML content for a help page.
    /// </summary>
    /// <param name="path">Path relative to user-manual folder (e.g., "crm/customer-list").</param>
    /// <returns>HTML content or null if not found.</returns>
    Task<string?> GetHelpContentAsync(string path);
}
```

### HelpService Implementation

```csharp
public class HelpService : IHelpService
{
    private readonly HttpClient _httpClient;
    private readonly IStringLocalizer _localizer;
    private readonly MarkdownPipeline _pipeline;

    public HelpService(HttpClient httpClient, IStringLocalizer localizer)
    {
        _httpClient = httpClient;
        _localizer = localizer;
        _pipeline = new MarkdownPipelineBuilder()
            .UseAdvancedExtensions()
            .Build();
    }

    public async Task<string?> GetHelpContentAsync(string path)
    {
        var culture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName;
        var fileName = culture == "de" 
            ? $"{path}.md" 
            : $"{path}.{culture}.md";

        try
        {
            var markdown = await _httpClient.GetStringAsync(
                $"docs/business/user-manual/{fileName}");
            return Markdig.Markdown.ToHtml(markdown, _pipeline);
        }
        catch (HttpRequestException)
        {
            // Fallback to German if translation not found
            if (culture != "de")
            {
                var fallbackFileName = $"{path}.md";
                try
                {
                    var fallbackMarkdown = await _httpClient.GetStringAsync(
                        $"docs/business/user-manual/{fallbackFileName}");
                    return Markdig.Markdown.ToHtml(fallbackMarkdown, _pipeline);
                }
                catch (HttpRequestException)
                {
                    return null;
                }
            }
            return null;
        }
    }
}
```

---

## Localization Workflow

1. **Create German version first** (`customer-list.md`)
2. **Add English translation** (`customer-list.en.md`)
3. **Keep files in sync** - update both when content changes
4. **Use relative links** - `[Kundendetails](customer-detail.md)` auto-resolves

### Link Resolution

In German file:
```markdown
[Kundendetails](customer-detail.md)
```

In English file:
```markdown
[Customer Details](customer-detail.en.md)
```

The `HelpService` handles language detection automatically.
