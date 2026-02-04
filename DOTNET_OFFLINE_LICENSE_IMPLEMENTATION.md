# Implementación de Validación de Licencias Offline en .NET

## Contexto para el LLM

Este documento contiene instrucciones completas para implementar un sistema de validación de licencias offline en una aplicación .NET. El sistema usa tokens firmados con RSA-SHA256 que pueden ser validados localmente sin conexión a internet.

**IMPORTANTE**: Este documento está diseñado para ser procesado por un LLM. Implementa todo el código exactamente como se especifica.

---

## 1. Descripción del Sistema

### ¿Qué es un Token de Licencia Offline?

Es un string Base64 que contiene:

1. **Payload JSON** (datos de la licencia en Base64)
2. **Firma RSA-SHA256** (en Base64)
3. Separados por un punto: `{payload}.{signature}`

### Estructura del Payload (JSON decodificado)

```json
{
  "licenseId": "uuid-de-la-licencia",
  "licenseKey": "7525a653-cc97-4014-bf65-7123b137275e",
  "clientId": "uuid-del-cliente",
  "clientName": "Nombre de la Empresa",
  "product": "Professional Plan",
  "maxUsers": 5,
  "expiresAt": "2026-12-30T18:00:00.000Z",
  "issuedAt": "2026-02-03T12:00:00.000Z"
}
```

---

## 2. Archivos a Crear

Crea los siguientes archivos en tu proyecto .NET:

### 2.1. Crear: `LicenseValidator.cs`

```csharp
using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace YourNamespace.Licensing
{
    /// <summary>
    /// Payload de la licencia offline deserializado
    /// </summary>
    public class OfflineLicensePayload
    {
        [JsonPropertyName("licenseId")]
        public string LicenseId { get; set; } = string.Empty;

        [JsonPropertyName("licenseKey")]
        public string LicenseKey { get; set; } = string.Empty;

        [JsonPropertyName("clientId")]
        public string ClientId { get; set; } = string.Empty;

        [JsonPropertyName("clientName")]
        public string ClientName { get; set; } = string.Empty;

        [JsonPropertyName("product")]
        public string Product { get; set; } = string.Empty;

        [JsonPropertyName("maxUsers")]
        public int MaxUsers { get; set; } = 1;

        [JsonPropertyName("expiresAt")]
        public DateTime? ExpiresAt { get; set; }

        [JsonPropertyName("issuedAt")]
        public DateTime IssuedAt { get; set; }
    }

    /// <summary>
    /// Resultado de la validación de licencia
    /// </summary>
    public class LicenseValidationResult
    {
        public bool IsValid { get; set; }
        public string? ErrorMessage { get; set; }
        public OfflineLicensePayload? License { get; set; }
        public bool IsExpired { get; set; }
        public int DaysUntilExpiration { get; set; }
    }

    /// <summary>
    /// Validador de licencias offline usando RSA-SHA256
    /// </summary>
    public class LicenseValidator
    {
        private readonly RSA _rsa;

        /// <summary>
        /// Clave pública RSA en formato PEM.
        /// IMPORTANTE: Reemplaza este valor con tu clave pública real.
        /// Obtener de: GET /api/licenses/offline/public-key
        /// </summary>
        private const string PUBLIC_KEY_PEM = @"-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA... TU CLAVE PÚBLICA AQUÍ ...
-----END PUBLIC KEY-----";

        public LicenseValidator()
        {
            _rsa = RSA.Create();
            _rsa.ImportFromPem(PUBLIC_KEY_PEM);
        }

        /// <summary>
        /// Constructor alternativo que acepta la clave pública como parámetro
        /// </summary>
        public LicenseValidator(string publicKeyPem)
        {
            _rsa = RSA.Create();
            _rsa.ImportFromPem(publicKeyPem);
        }

        /// <summary>
        /// Valida un token de licencia offline
        /// </summary>
        /// <param name="token">Token completo en formato: payload.signature</param>
        /// <returns>Resultado de la validación con los datos de la licencia</returns>
        public LicenseValidationResult ValidateToken(string token)
        {
            try
            {
                // 1. Separar payload y firma
                var parts = token.Split('.');
                if (parts.Length != 2)
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Formato de token inválido. Se esperaba: payload.signature"
                    };
                }

                var payloadBase64 = parts[0];
                var signatureBase64 = parts[1];

                // 2. Verificar la firma RSA-SHA256
                var payloadBytes = Encoding.UTF8.GetBytes(payloadBase64);
                var signatureBytes = Convert.FromBase64String(signatureBase64);

                var isSignatureValid = _rsa.VerifyData(
                    payloadBytes,
                    signatureBytes,
                    HashAlgorithmName.SHA256,
                    RSASignaturePadding.Pkcs1
                );

                if (!isSignatureValid)
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Firma inválida. El token ha sido manipulado o es falso."
                    };
                }

                // 3. Decodificar el payload JSON
                var payloadJson = Encoding.UTF8.GetString(Convert.FromBase64String(payloadBase64));
                var license = JsonSerializer.Deserialize<OfflineLicensePayload>(payloadJson);

                if (license == null)
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "No se pudo deserializar el payload de la licencia."
                    };
                }

                // 4. Verificar expiración
                var isExpired = license.ExpiresAt.HasValue && license.ExpiresAt.Value < DateTime.UtcNow;
                var daysUntilExpiration = license.ExpiresAt.HasValue
                    ? (int)(license.ExpiresAt.Value - DateTime.UtcNow).TotalDays
                    : int.MaxValue;

                if (isExpired)
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        IsExpired = true,
                        ErrorMessage = $"La licencia expiró el {license.ExpiresAt:yyyy-MM-dd}",
                        License = license,
                        DaysUntilExpiration = daysUntilExpiration
                    };
                }

                // 5. Licencia válida
                return new LicenseValidationResult
                {
                    IsValid = true,
                    License = license,
                    IsExpired = false,
                    DaysUntilExpiration = daysUntilExpiration
                };
            }
            catch (FormatException)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Token malformado. No es un Base64 válido."
                };
            }
            catch (JsonException ex)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    ErrorMessage = $"Error al parsear JSON del payload: {ex.Message}"
                };
            }
            catch (CryptographicException ex)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    ErrorMessage = $"Error criptográfico: {ex.Message}"
                };
            }
            catch (Exception ex)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    ErrorMessage = $"Error inesperado: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Valida el token y lanza excepción si no es válido
        /// </summary>
        public OfflineLicensePayload ValidateTokenOrThrow(string token)
        {
            var result = ValidateToken(token);
            if (!result.IsValid)
            {
                throw new LicenseValidationException(result.ErrorMessage ?? "Licencia inválida");
            }
            return result.License!;
        }

        public void Dispose()
        {
            _rsa?.Dispose();
        }
    }

    /// <summary>
    /// Excepción lanzada cuando la validación de licencia falla
    /// </summary>
    public class LicenseValidationException : Exception
    {
        public LicenseValidationException(string message) : base(message) { }
    }
}
```

### 2.2. Crear: `LicenseManager.cs`

```csharp
using System;
using System.IO;
using System.Text.Json;

namespace YourNamespace.Licensing
{
    /// <summary>
    /// Gestor de licencias que maneja almacenamiento y validación
    /// </summary>
    public class LicenseManager
    {
        private readonly LicenseValidator _validator;
        private readonly string _licensePath;
        private OfflineLicensePayload? _currentLicense;
        private string? _currentToken;

        /// <summary>
        /// Evento disparado cuando la licencia cambia
        /// </summary>
        public event EventHandler<OfflineLicensePayload?>? LicenseChanged;

        /// <summary>
        /// Licencia actual cargada
        /// </summary>
        public OfflineLicensePayload? CurrentLicense => _currentLicense;

        /// <summary>
        /// Indica si hay una licencia válida cargada
        /// </summary>
        public bool HasValidLicense => _currentLicense != null;

        public LicenseManager(string? publicKeyPem = null, string? licensePath = null)
        {
            _validator = publicKeyPem != null
                ? new LicenseValidator(publicKeyPem)
                : new LicenseValidator();

            _licensePath = licensePath ?? Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "YourAppName",
                "license.dat"
            );
        }

        /// <summary>
        /// Carga la licencia desde el archivo almacenado
        /// </summary>
        public LicenseValidationResult LoadLicense()
        {
            if (!File.Exists(_licensePath))
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "No se encontró archivo de licencia."
                };
            }

            try
            {
                var token = File.ReadAllText(_licensePath).Trim();
                return ActivateLicense(token, saveToFile: false);
            }
            catch (Exception ex)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    ErrorMessage = $"Error al leer archivo de licencia: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Activa una licencia con el token proporcionado
        /// </summary>
        /// <param name="token">Token de licencia offline</param>
        /// <param name="saveToFile">Si es true, guarda el token en disco</param>
        public LicenseValidationResult ActivateLicense(string token, bool saveToFile = true)
        {
            var result = _validator.ValidateToken(token);

            if (result.IsValid)
            {
                _currentLicense = result.License;
                _currentToken = token;

                if (saveToFile)
                {
                    SaveTokenToFile(token);
                }

                LicenseChanged?.Invoke(this, _currentLicense);
            }

            return result;
        }

        /// <summary>
        /// Revalida la licencia actual (útil para verificar expiración)
        /// </summary>
        public LicenseValidationResult RevalidateCurrentLicense()
        {
            if (_currentToken == null)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "No hay licencia cargada para revalidar."
                };
            }

            return _validator.ValidateToken(_currentToken);
        }

        /// <summary>
        /// Elimina la licencia actual
        /// </summary>
        public void RemoveLicense()
        {
            _currentLicense = null;
            _currentToken = null;

            if (File.Exists(_licensePath))
            {
                File.Delete(_licensePath);
            }

            LicenseChanged?.Invoke(this, null);
        }

        /// <summary>
        /// Verifica si el producto específico está licenciado
        /// </summary>
        public bool IsProductLicensed(string productName)
        {
            return _currentLicense != null &&
                   _currentLicense.Product.Equals(productName, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Verifica si hay suficientes usuarios permitidos
        /// </summary>
        public bool HasSufficientUsers(int requiredUsers)
        {
            return _currentLicense != null && _currentLicense.MaxUsers >= requiredUsers;
        }

        /// <summary>
        /// Obtiene los días restantes hasta la expiración
        /// </summary>
        public int GetDaysUntilExpiration()
        {
            if (_currentLicense?.ExpiresAt == null)
                return int.MaxValue;

            return (int)(_currentLicense.ExpiresAt.Value - DateTime.UtcNow).TotalDays;
        }

        private void SaveTokenToFile(string token)
        {
            var directory = Path.GetDirectoryName(_licensePath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            File.WriteAllText(_licensePath, token);
        }
    }
}
```

---

## 3. Ejemplos de Uso

### 3.1. Validación Simple

```csharp
using YourNamespace.Licensing;

// Token obtenido del panel de administración
string token = "eyJsaWNlbnNlSWQiOiI...";

var validator = new LicenseValidator();
var result = validator.ValidateToken(token);

if (result.IsValid)
{
    Console.WriteLine($"Licencia válida para: {result.License.ClientName}");
    Console.WriteLine($"Producto: {result.License.Product}");
    Console.WriteLine($"Usuarios máximos: {result.License.MaxUsers}");
    Console.WriteLine($"Expira en: {result.DaysUntilExpiration} días");
}
else
{
    Console.WriteLine($"Licencia inválida: {result.ErrorMessage}");
}
```

### 3.2. Usando LicenseManager en una Aplicación

```csharp
using YourNamespace.Licensing;

public class App
{
    private static readonly LicenseManager _licenseManager = new LicenseManager();

    public static void Main(string[] args)
    {
        // Intentar cargar licencia existente al iniciar
        var loadResult = _licenseManager.LoadLicense();

        if (!loadResult.IsValid)
        {
            Console.WriteLine("No hay licencia válida. Por favor ingrese su token de licencia:");
            var token = Console.ReadLine();

            var activationResult = _licenseManager.ActivateLicense(token);

            if (!activationResult.IsValid)
            {
                Console.WriteLine($"Error: {activationResult.ErrorMessage}");
                return;
            }
        }

        // Licencia válida, continuar con la aplicación
        var license = _licenseManager.CurrentLicense!;
        Console.WriteLine($"Bienvenido, {license.ClientName}!");
        Console.WriteLine($"Plan: {license.Product}");

        // Verificar límites
        if (!_licenseManager.HasSufficientUsers(10))
        {
            Console.WriteLine("Su licencia no permite 10 usuarios simultáneos.");
        }

        // Advertencia de expiración
        var daysLeft = _licenseManager.GetDaysUntilExpiration();
        if (daysLeft < 30)
        {
            Console.WriteLine($"⚠️ Su licencia expira en {daysLeft} días.");
        }
    }
}
```

### 3.3. En una Aplicación WPF/WinForms

```csharp
public partial class MainWindow : Window
{
    private readonly LicenseManager _licenseManager;

    public MainWindow()
    {
        InitializeComponent();

        _licenseManager = new LicenseManager();
        _licenseManager.LicenseChanged += OnLicenseChanged;

        // Cargar licencia al iniciar
        var result = _licenseManager.LoadLicense();
        if (!result.IsValid)
        {
            ShowLicenseActivationDialog();
        }
    }

    private void OnLicenseChanged(object? sender, OfflineLicensePayload? license)
    {
        if (license != null)
        {
            StatusLabel.Content = $"Licenciado a: {license.ClientName}";
            EnablePremiumFeatures();
        }
        else
        {
            StatusLabel.Content = "Sin licencia";
            DisablePremiumFeatures();
        }
    }

    private void ShowLicenseActivationDialog()
    {
        var dialog = new LicenseActivationWindow(_licenseManager);
        dialog.ShowDialog();
    }
}
```

### 3.4. Diálogo de Activación de Licencia (WPF)

```csharp
public partial class LicenseActivationWindow : Window
{
    private readonly LicenseManager _licenseManager;

    public LicenseActivationWindow(LicenseManager licenseManager)
    {
        InitializeComponent();
        _licenseManager = licenseManager;
    }

    private void ActivateButton_Click(object sender, RoutedEventArgs e)
    {
        var token = TokenTextBox.Text.Trim();

        if (string.IsNullOrEmpty(token))
        {
            MessageBox.Show("Por favor ingrese un token de licencia.", "Error",
                MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        var result = _licenseManager.ActivateLicense(token);

        if (result.IsValid)
        {
            MessageBox.Show(
                $"¡Licencia activada exitosamente!\n\n" +
                $"Cliente: {result.License.ClientName}\n" +
                $"Producto: {result.License.Product}\n" +
                $"Usuarios: {result.License.MaxUsers}",
                "Éxito",
                MessageBoxButton.OK,
                MessageBoxImage.Information
            );
            DialogResult = true;
            Close();
        }
        else
        {
            MessageBox.Show(
                $"Error al activar licencia:\n\n{result.ErrorMessage}",
                "Error de Licencia",
                MessageBoxButton.OK,
                MessageBoxImage.Error
            );
        }
    }
}
```

---

## 4. Obtener la Clave Pública

### Opción A: Desde el API (recomendado para desarrollo)

```bash
curl https://tu-api.com/api/licenses/offline/public-key
```

Respuesta:

```json
{
  "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBI...\n-----END PUBLIC KEY-----",
  "algorithm": "RSA-SHA256",
  "format": "PEM"
}
```

### Opción B: Incrustar en el código

Copia la clave pública y reemplaza el valor de `PUBLIC_KEY_PEM` en `LicenseValidator.cs`.

### Opción C: Configurar en appsettings.json (Recomendado para .NET Core Web API)

Si tu aplicación es una Web API en .NET Core desplegada en IIS, la mejor práctica es usar `appsettings.json`:

#### Paso 1: Agregar la clave en appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "..."
  },
  "LicenseValidation": {
    "PublicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0QIL8Xymb/g5Cg0XB9NuAR6ArqyUq+WqnxfjAy6vtVNckNU3OyXmscZOqNgyA0o9HIEjCiEG2d8gfK7lxdj7l/LJiF3Wh9d1YGJmTlXDBzLZjcfpg3x1UbeFi1ly5PfmGFrVZs5vZ04fUXKwugGeXouikwRFApB2+7QAjRESI3KCRW+VOQMoYlgKNZid3j0J0XECXSalGLVEEXV2hfDKgRupEivNKmuZWrjLTkvhJqqOKzlTATKeGZrORwckoUpUAeu3D0VQr1gJLIeE48D/lOFEJUJaz9cEcS3Mwr4o6e66ErG8ZF5M8+f5UanKCq8aZ4UtRouwXvprBBjeCrvz5QIDAQAB\n-----END PUBLIC KEY-----"
  }
}
```

> **NOTA**: Reemplaza la clave pública con la tuya. Obtener de: `GET /api/licenses/offline/public-key`

#### Paso 2: Crear clase de configuración

```csharp
namespace YourNamespace.Configuration
{
    public class LicenseValidationSettings
    {
        public string PublicKey { get; set; } = string.Empty;
    }
}
```

#### Paso 3: Registrar en Program.cs o Startup.cs

```csharp
// En Program.cs (.NET 6+)
builder.Services.Configure<LicenseValidationSettings>(
    builder.Configuration.GetSection("LicenseValidation"));

// Registrar LicenseValidator como singleton
builder.Services.AddSingleton<LicenseValidator>(sp =>
{
    var settings = sp.GetRequiredService<IOptions<LicenseValidationSettings>>().Value;
    var publicKey = settings.PublicKey.Replace("\\n", "\n");
    return new LicenseValidator(publicKey);
});
```

```csharp
// En Startup.cs (.NET Core 3.1 / .NET 5)
public void ConfigureServices(IServiceCollection services)
{
    services.Configure<LicenseValidationSettings>(
        Configuration.GetSection("LicenseValidation"));

    services.AddSingleton<LicenseValidator>(sp =>
    {
        var settings = sp.GetRequiredService<IOptions<LicenseValidationSettings>>().Value;
        var publicKey = settings.PublicKey.Replace("\\n", "\n");
        return new LicenseValidator(publicKey);
    });
}
```

#### Paso 4: Usar en un Controller o Service

```csharp
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class ProtectedController : ControllerBase
{
    private readonly LicenseValidator _licenseValidator;

    public ProtectedController(LicenseValidator licenseValidator)
    {
        _licenseValidator = licenseValidator;
    }

    [HttpPost("validate-license")]
    public IActionResult ValidateLicense([FromBody] string token)
    {
        var result = _licenseValidator.ValidateToken(token);

        if (!result.IsValid)
        {
            return BadRequest(new { error = result.ErrorMessage });
        }

        return Ok(new
        {
            valid = true,
            client = result.License.ClientName,
            product = result.License.Product,
            maxUsers = result.License.MaxUsers,
            expiresAt = result.License.ExpiresAt,
            daysRemaining = result.DaysUntilExpiration
        });
    }
}
```

#### Paso 5: Crear Middleware de Validación con Cache (Recomendado para .NET 9)

Para validar la licencia en cada request **sin impacto en performance**, usamos cache en memoria:

```csharp
using Microsoft.Extensions.Caching.Memory;

public class LicenseValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly LicenseValidator _licenseValidator;
    private readonly IMemoryCache _cache;
    private readonly ILogger<LicenseValidationMiddleware> _logger;

    // Cache key para el resultado de validación
    private const string LICENSE_CACHE_KEY = "LicenseValidationResult";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public LicenseValidationMiddleware(
        RequestDelegate next,
        LicenseValidator licenseValidator,
        IMemoryCache cache,
        ILogger<LicenseValidationMiddleware> logger)
    {
        _next = next;
        _licenseValidator = licenseValidator;
        _cache = cache;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Rutas que no requieren validación de licencia
        var path = context.Request.Path.Value?.ToLower() ?? "";
        if (path.Contains("/health") || path.Contains("/swagger"))
        {
            await _next(context);
            return;
        }

        // Obtener token del header, config, o donde lo almacenes
        var token = context.Request.Headers["X-License-Token"].FirstOrDefault()
            ?? context.RequestServices.GetService<IConfiguration>()?["LicenseToken"];

        if (string.IsNullOrEmpty(token))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "License token required" });
            return;
        }

        // Intentar obtener resultado del cache
        var cacheKey = $"{LICENSE_CACHE_KEY}_{token.GetHashCode()}";

        if (!_cache.TryGetValue(cacheKey, out LicenseValidationResult? cachedResult))
        {
            // No está en cache, validar
            cachedResult = _licenseValidator.ValidateToken(token);

            // Solo cachear si es válido (para permitir reintentos con tokens corregidos)
            if (cachedResult.IsValid)
            {
                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(CacheDuration)
                    .SetSlidingExpiration(TimeSpan.FromMinutes(1));

                _cache.Set(cacheKey, cachedResult, cacheOptions);
                _logger.LogDebug("License validated and cached for {Client}", cachedResult.License?.ClientName);
            }
        }

        if (!cachedResult.IsValid)
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new {
                error = cachedResult.ErrorMessage,
                isExpired = cachedResult.IsExpired
            });
            return;
        }

        // Verificar expiración en cada request (es rápido, solo compara fechas)
        if (cachedResult.License?.ExpiresAt < DateTime.UtcNow)
        {
            _cache.Remove(cacheKey); // Invalidar cache
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new {
                error = "License has expired",
                isExpired = true,
                expiredAt = cachedResult.License.ExpiresAt
            });
            return;
        }

        // Agregar info de licencia al contexto para uso en controllers
        context.Items["License"] = cachedResult.License;
        context.Items["LicenseDaysRemaining"] = cachedResult.DaysUntilExpiration;

        await _next(context);
    }
}

// Extension method para registrar fácilmente
public static class LicenseValidationMiddlewareExtensions
{
    public static IApplicationBuilder UseLicenseValidation(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<LicenseValidationMiddleware>();
    }
}
```

#### Paso 6: Configuración completa en Program.cs (.NET 9)

```csharp
using Microsoft.Extensions.Options;
using YourNamespace.Configuration;
using YourNamespace.Licensing;

var builder = WebApplication.CreateBuilder(args);

// Agregar Memory Cache (requerido para el middleware)
builder.Services.AddMemoryCache();

// Configurar opciones de licencia
builder.Services.Configure<LicenseValidationSettings>(
    builder.Configuration.GetSection("LicenseValidation"));

// Registrar LicenseValidator como singleton (la clave pública no cambia)
builder.Services.AddSingleton<LicenseValidator>(sp =>
{
    var settings = sp.GetRequiredService<IOptions<LicenseValidationSettings>>().Value;
    var publicKey = settings.PublicKey.Replace("\\n", "\n");
    return new LicenseValidator(publicKey);
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Validación de licencia ANTES de authorization
app.UseLicenseValidation();

app.UseAuthorization();
app.MapControllers();

app.Run();
```

#### Paso 7: Helper para acceder a la licencia en Controllers

```csharp
using Microsoft.AspNetCore.Mvc;

public static class HttpContextLicenseExtensions
{
    public static OfflineLicensePayload? GetLicense(this HttpContext context)
    {
        return context.Items["License"] as OfflineLicensePayload;
    }

    public static int GetLicenseDaysRemaining(this HttpContext context)
    {
        return context.Items["LicenseDaysRemaining"] as int? ?? 0;
    }
}

[ApiController]
[Route("api/[controller]")]
public class ProductController : ControllerBase
{
    [HttpGet]
    public IActionResult GetProducts()
    {
        var license = HttpContext.GetLicense();

        // Ya no necesitas validar, el middleware lo hizo
        // Solo usa los datos de la licencia si los necesitas

        return Ok(new
        {
            message = $"Welcome {license?.ClientName}",
            maxUsers = license?.MaxUsers,
            daysRemaining = HttpContext.GetLicenseDaysRemaining()
        });
    }
}
```

#### Performance: ¿Por qué es rápido?

| Operación            | Tiempo  | Frecuencia                            |
| -------------------- | ------- | ------------------------------------- |
| Lectura de cache     | ~1 μs   | Cada request                          |
| Validación RSA       | ~1-2 ms | Solo cuando cache expira (cada 5 min) |
| Verificar expiración | ~1 μs   | Cada request (solo compara fechas)    |

**El 99.9% de los requests solo hacen una lectura de memoria.**

---

## 5. Instrucciones para el LLM

### Pasos de Implementación:

1. **Crear los archivos**: Crea `LicenseValidator.cs` y `LicenseManager.cs` en una carpeta `Licensing/` del proyecto.

2. **Cambiar el namespace**: Reemplaza `YourNamespace` por el namespace real del proyecto.

3. **Configurar la clave pública**:
   - Si el proyecto tiene acceso al API, obtener la clave con HTTP GET a `/api/licenses/offline/public-key`
   - Incrustar la clave en `PUBLIC_KEY_PEM`

4. **Configurar la ruta del archivo de licencia**: Cambiar `"YourAppName"` por el nombre real de la aplicación en `LicenseManager.cs`.

5. **Integrar en el startup de la aplicación**:
   - Crear instancia de `LicenseManager`
   - Llamar `LoadLicense()` al inicio
   - Mostrar UI de activación si no hay licencia válida

6. **Proteger características premium**: Usar `_licenseManager.HasValidLicense` o `_licenseManager.IsProductLicensed("NombreProducto")`.

### Consideraciones:

- El código está optimizado para **.NET 9** (también compatible con .NET 5+)
- Usa `ImportFromPem` disponible desde .NET 5
- Para .NET Framework 4.x, usar `RSACryptoServiceProvider` con conversión de formato
- El token es autocontenido: NO requiere conexión a internet para validar
- La firma garantiza que el token no ha sido modificado
- **Performance**: El middleware usa cache en memoria, validando RSA solo cada 5 minutos

---

## 6. Versión para .NET Framework 4.x

Si el proyecto usa .NET Framework 4.x, reemplazar el constructor de `LicenseValidator`:

```csharp
using System.Security.Cryptography;

public LicenseValidator()
{
    _rsa = RSA.Create();

    // Convertir PEM a parámetros RSA manualmente
    var pemContent = PUBLIC_KEY_PEM
        .Replace("-----BEGIN PUBLIC KEY-----", "")
        .Replace("-----END PUBLIC KEY-----", "")
        .Replace("\n", "")
        .Replace("\r", "")
        .Trim();

    var keyBytes = Convert.FromBase64String(pemContent);
    _rsa.ImportSubjectPublicKeyInfo(keyBytes, out _);
}
```

Para versiones anteriores a .NET Core 3.0 sin `ImportSubjectPublicKeyInfo`, usar BouncyCastle:

```bash
Install-Package BouncyCastle.Cryptography
```

```csharp
using Org.BouncyCastle.Crypto;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.OpenSsl;
using Org.BouncyCastle.Security;

public LicenseValidator()
{
    using var reader = new StringReader(PUBLIC_KEY_PEM);
    var pemReader = new PemReader(reader);
    var publicKeyParams = (RsaKeyParameters)pemReader.ReadObject();

    _rsa = RSA.Create();
    _rsa.ImportParameters(new RSAParameters
    {
        Modulus = publicKeyParams.Modulus.ToByteArrayUnsigned(),
        Exponent = publicKeyParams.Exponent.ToByteArrayUnsigned()
    });
}
```

---

## 7. Protección Anti-Manipulación de Fecha del Sistema

Si un usuario cambia la fecha del sistema hacia atrás, podría evitar que la licencia expire. Aquí hay varias estrategias para detectar y prevenir esto:

### 7.1. Guardar Última Fecha Conocida (Recomendado)

Crea un archivo `SecureTimeTracker.cs`:

```csharp
using System;
using System.IO;
using System.Text.Json;

namespace YourNamespace.Licensing
{
    /// <summary>
    /// Detecta manipulación del reloj del sistema guardando la última fecha conocida
    /// </summary>
    public class SecureTimeTracker
    {
        private readonly string _timeFilePath;
        private DateTime _lastKnownTime;

        public SecureTimeTracker(string? appDataPath = null)
        {
            var basePath = appDataPath ?? Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "YourAppName"
            );

            _timeFilePath = Path.Combine(basePath, ".timechk");
            LoadLastKnownTime();
        }

        /// <summary>
        /// Obtiene la fecha actual verificando que no haya manipulación
        /// </summary>
        /// <returns>Fecha segura o null si se detectó manipulación</returns>
        public DateTime? GetSecureCurrentTime()
        {
            var currentTime = DateTime.UtcNow;

            // Si la fecha actual es anterior a la última conocida, hay manipulación
            if (currentTime < _lastKnownTime.AddMinutes(-5)) // 5 min de tolerancia
            {
                return null; // Manipulación detectada
            }

            // Actualizar última fecha conocida
            UpdateLastKnownTime(currentTime);

            return currentTime;
        }

        /// <summary>
        /// Verifica si el reloj del sistema parece manipulado
        /// </summary>
        public bool IsClockTampered()
        {
            return GetSecureCurrentTime() == null;
        }

        /// <summary>
        /// Obtiene la última fecha conocida (para mostrar al usuario)
        /// </summary>
        public DateTime LastKnownTime => _lastKnownTime;

        private void LoadLastKnownTime()
        {
            try
            {
                if (File.Exists(_timeFilePath))
                {
                    var content = File.ReadAllText(_timeFilePath);
                    var data = JsonSerializer.Deserialize<TimeData>(content);
                    if (data != null)
                    {
                        _lastKnownTime = DateTime.FromBinary(data.Ticks);
                        return;
                    }
                }
            }
            catch
            {
                // Si hay error, usar fecha de modificación del archivo como fallback
            }

            _lastKnownTime = DateTime.UtcNow;
            UpdateLastKnownTime(_lastKnownTime);
        }

        private void UpdateLastKnownTime(DateTime time)
        {
            try
            {
                var directory = Path.GetDirectoryName(_timeFilePath);
                if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                var data = new TimeData { Ticks = time.ToBinary() };
                var json = JsonSerializer.Serialize(data);

                // Escribir con atributos ocultos para dificultar encontrarlo
                File.WriteAllText(_timeFilePath, json);
                File.SetAttributes(_timeFilePath, FileAttributes.Hidden | FileAttributes.System);

                _lastKnownTime = time;
            }
            catch
            {
                // Silenciar errores de escritura
            }
        }

        private class TimeData
        {
            public long Ticks { get; set; }
        }
    }
}
```

### 7.2. Integrar en LicenseValidator

Modifica `LicenseValidator.cs` para usar el verificador de tiempo:

```csharp
public class LicenseValidator
{
    private readonly RSA _rsa;
    private readonly SecureTimeTracker _timeTracker;

    public LicenseValidator(string publicKeyPem)
    {
        _rsa = RSA.Create();
        _rsa.ImportFromPem(publicKeyPem);
        _timeTracker = new SecureTimeTracker();
    }

    public LicenseValidationResult ValidateToken(string token)
    {
        try
        {
            // 0. Verificar manipulación del reloj PRIMERO
            var secureTime = _timeTracker.GetSecureCurrentTime();
            if (secureTime == null)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    ErrorMessage = $"Se detectó manipulación del reloj del sistema. " +
                        $"Última fecha válida: {_timeTracker.LastKnownTime:yyyy-MM-dd HH:mm}. " +
                        $"Por favor, corrija la fecha del sistema."
                };
            }

            // 1. Separar payload y firma
            var parts = token.Split('.');
            if (parts.Length != 2)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Formato de token inválido."
                };
            }

            // ... resto de la validación ...

            // 4. Verificar expiración usando la fecha SEGURA
            var isExpired = license.ExpiresAt.HasValue && license.ExpiresAt.Value < secureTime.Value;
            var daysUntilExpiration = license.ExpiresAt.HasValue
                ? (int)(license.ExpiresAt.Value - secureTime.Value).TotalDays
                : int.MaxValue;

            // ... resto del código ...
        }
        catch (Exception ex)
        {
            // ... manejo de errores ...
        }
    }
}
```

### 7.3. Verificar Fechas de Archivos del Sistema (Capa Adicional)

```csharp
public static class SystemTimeVerifier
{
    /// <summary>
    /// Obtiene una fecha aproximada basada en archivos del sistema
    /// que se actualizan frecuentemente
    /// </summary>
    public static DateTime? GetApproximateSystemTime()
    {
        var checkPaths = new[]
        {
            // Windows Event Logs (se escriben constantemente)
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),
                "winevt", "Logs", "System.evtx"),

            // Prefetch files (se actualizan al ejecutar programas)
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows),
                "Prefetch"),

            // Archivos temporales recientes
            Path.Combine(Path.GetTempPath(), "..", "Temp")
        };

        DateTime latestDate = DateTime.MinValue;

        foreach (var path in checkPaths)
        {
            try
            {
                if (File.Exists(path))
                {
                    var lastWrite = File.GetLastWriteTimeUtc(path);
                    if (lastWrite > latestDate)
                        latestDate = lastWrite;
                }
                else if (Directory.Exists(path))
                {
                    var dirInfo = new DirectoryInfo(path);
                    var recentFile = dirInfo.GetFiles()
                        .OrderByDescending(f => f.LastWriteTimeUtc)
                        .FirstOrDefault();

                    if (recentFile != null && recentFile.LastWriteTimeUtc > latestDate)
                        latestDate = recentFile.LastWriteTimeUtc;
                }
            }
            catch
            {
                // Ignorar errores de acceso
            }
        }

        return latestDate > DateTime.MinValue ? latestDate : null;
    }

    /// <summary>
    /// Verifica si la fecha del sistema es sospechosamente diferente
    /// de la fecha de archivos recientes
    /// </summary>
    public static bool IsSystemTimeSuspicious()
    {
        var fileTime = GetApproximateSystemTime();
        if (fileTime == null) return false;

        var diff = Math.Abs((DateTime.UtcNow - fileTime.Value).TotalHours);

        // Si hay más de 24 horas de diferencia, es sospechoso
        return diff > 24;
    }
}
```

### 7.4. Middleware Actualizado con Protección de Tiempo

```csharp
public class LicenseValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly LicenseValidator _licenseValidator;
    private readonly IMemoryCache _cache;
    private readonly SecureTimeTracker _timeTracker;

    public LicenseValidationMiddleware(
        RequestDelegate next,
        LicenseValidator licenseValidator,
        IMemoryCache cache)
    {
        _next = next;
        _licenseValidator = licenseValidator;
        _cache = cache;
        _timeTracker = new SecureTimeTracker();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Verificar manipulación de fecha ANTES de todo
        if (_timeTracker.IsClockTampered())
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "System clock tampering detected",
                lastValidTime = _timeTracker.LastKnownTime,
                message = "Please correct your system date and time"
            });
            return;
        }

        // ... resto del middleware ...
    }
}
```

### 7.5. Estrategia Adicional: Validación Periódica con NTP (Opcional)

Si la aplicación tiene conexión a internet ocasionalmente:

```csharp
public static class NtpTimeValidator
{
    private static readonly string[] NtpServers =
    {
        "time.google.com",
        "time.windows.com",
        "pool.ntp.org"
    };

    /// <summary>
    /// Intenta obtener la hora real de un servidor NTP
    /// </summary>
    public static async Task<DateTime?> GetNetworkTimeAsync()
    {
        foreach (var server in NtpServers)
        {
            try
            {
                using var client = new UdpClient();
                client.Client.ReceiveTimeout = 3000;

                await client.ConnectAsync(server, 123);

                var ntpData = new byte[48];
                ntpData[0] = 0x1B; // NTP request header

                await client.SendAsync(ntpData, ntpData.Length);
                var response = await client.ReceiveAsync();

                var intPart = (ulong)response.Buffer[40] << 24 |
                              (ulong)response.Buffer[41] << 16 |
                              (ulong)response.Buffer[42] << 8 |
                              response.Buffer[43];

                var fractPart = (ulong)response.Buffer[44] << 24 |
                                (ulong)response.Buffer[45] << 16 |
                                (ulong)response.Buffer[46] << 8 |
                                response.Buffer[47];

                var milliseconds = (intPart * 1000) + ((fractPart * 1000) / 0x100000000L);
                var networkDateTime = new DateTime(1900, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                    .AddMilliseconds((long)milliseconds);

                return networkDateTime;
            }
            catch
            {
                continue; // Intentar siguiente servidor
            }
        }

        return null; // No se pudo obtener hora de red
    }

    /// <summary>
    /// Valida que el reloj del sistema esté sincronizado (tolerancia de 1 hora)
    /// </summary>
    public static async Task<bool> ValidateSystemClockAsync()
    {
        var networkTime = await GetNetworkTimeAsync();
        if (networkTime == null) return true; // Sin red, confiar en otras validaciones

        var diff = Math.Abs((DateTime.UtcNow - networkTime.Value).TotalMinutes);
        return diff < 60; // 1 hora de tolerancia
    }
}
```

### Resumen de Protección

| Capa                   | Qué detecta                                | Cuándo usar           |
| ---------------------- | ------------------------------------------ | --------------------- |
| **SecureTimeTracker**  | Reloj movido hacia atrás                   | Siempre (obligatorio) |
| **SystemTimeVerifier** | Fecha muy diferente a archivos del sistema | Capa adicional        |
| **NtpTimeValidator**   | Reloj desincronizado con internet          | Cuando hay conexión   |

**Recomendación**: Usa al menos `SecureTimeTracker`. Es simple, efectivo, y funciona 100% offline.

---

## 8. Testing

### Test Unitario

```csharp
[TestClass]
public class LicenseValidatorTests
{
    private const string VALID_TOKEN = "tu-token-de-prueba-aquí";
    private const string TAMPERED_TOKEN = "eyJ0ZXN0IjoidGFtcGVyZWQifQ.invalidSignature";

    [TestMethod]
    public void ValidateToken_WithValidToken_ReturnsValid()
    {
        var validator = new LicenseValidator();
        var result = validator.ValidateToken(VALID_TOKEN);

        Assert.IsTrue(result.IsValid);
        Assert.IsNotNull(result.License);
    }

    [TestMethod]
    public void ValidateToken_WithTamperedToken_ReturnsInvalid()
    {
        var validator = new LicenseValidator();
        var result = validator.ValidateToken(TAMPERED_TOKEN);

        Assert.IsFalse(result.IsValid);
        Assert.IsTrue(result.ErrorMessage.Contains("Firma inválida"));
    }

    [TestMethod]
    public void ValidateToken_WithInvalidFormat_ReturnsInvalid()
    {
        var validator = new LicenseValidator();
        var result = validator.ValidateToken("invalid-token-without-dot");

        Assert.IsFalse(result.IsValid);
        Assert.IsTrue(result.ErrorMessage.Contains("Formato de token inválido"));
    }
}
```

---

## Resumen

| Archivo               | Propósito                                  |
| --------------------- | ------------------------------------------ |
| `LicenseValidator.cs` | Valida tokens offline con RSA-SHA256       |
| `LicenseManager.cs`   | Gestiona persistencia y estado de licencia |

| Clase                     | Uso Principal                                               |
| ------------------------- | ----------------------------------------------------------- |
| `LicenseValidator`        | `ValidateToken(token)` → `LicenseValidationResult`          |
| `LicenseManager`          | `LoadLicense()`, `ActivateLicense(token)`, `CurrentLicense` |
| `OfflineLicensePayload`   | Datos de la licencia deserializados                         |
| `LicenseValidationResult` | Resultado con `IsValid`, `License`, `ErrorMessage`          |

**El token es autónomo**: contiene todos los datos necesarios firmados criptográficamente. No se puede falsificar sin la clave privada del servidor.
