# Implementacion de Validacion de Licencias Offline en .NET

## Contexto para el LLM

Este documento contiene instrucciones completas para implementar un sistema de validacion de licencias offline en una aplicacion .NET. El sistema usa tokens firmados con RSA-SHA256 que pueden ser validados localmente sin conexion a internet.

**IMPORTANTE**: Este documento esta disenado para ser procesado por un LLM. Implementa todo el codigo exactamente como se especifica.

---

## 1. Descripcion del Sistema

### Como se genera el token (lado servidor — Node.js)

El servidor construye el token en tres pasos:

**Paso 1**: Construir el payload de la licencia (objeto `OfflineLicensePayload`)

**Paso 2**: Firmar `JSON.stringify(payload)` con RSA-SHA256 (clave privada PKCS8) y crear el objeto token:
```json
{
  "data": { ...payload... },
  "signature": "<base64 de la firma RSA>",
  "algorithm": "RSA-SHA256",
  "version": 1
}
```

**Paso 3**: El token final es `Buffer.from(JSON.stringify(tokenObject)).toString('base64')`

El token es un **unico string Base64** — no tiene el formato `payload.signature`.

---

### Estructura del Payload (`data`)

```json
{
  "code": "uuid-del-cliente",
  "companyName": "Nombre de la Empresa",
  "product": "Professional Plan",
  "maxUsers": 5,
  "expiresAt": "2026-12-30T18:00:00.000Z",
  "issuedAt": "2026-02-03T12:00:00.000Z",
  "licenseId": "uuid-de-la-licencia",
  "licenseKey": "7525a653-cc97-4014-bf65-7123b137275e"
}
```

> **IMPORTANTE**: Los campos son `code` (no `clientId`) y `companyName` (no `clientName`).
> `expiresAt` puede ser `null` si la licencia no expira.

---

### Proceso de Verificacion en .NET

1. Base64-decodificar el token -> JSON del objeto `OfflineLicenseToken`
2. Extraer el JSON crudo del campo `data` (para reproducir exactamente lo que se firmo)
3. Verificar la firma RSA-SHA256: `verify(Encoding.UTF8.GetBytes(rawDataJson), base64Signature)` usando la clave publica SPKI
4. Si la firma es valida, deserializar `data` en `OfflineLicensePayload`
5. Verificar expiracion comparando `expiresAt` con `DateTime.UtcNow`

> **Critico**: La firma se creo sobre el string JSON del objeto `data` tal como aparece en el token decodificado. NO re-serialices el objeto C# para verificar; usa el JSON crudo extraido con `JsonDocument`.

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
    /// Payload de la licencia offline deserializado.
    /// Los nombres de campo deben coincidir exactamente con los del servidor.
    /// </summary>
    public class OfflineLicensePayload
    {
        /// <summary>Identificador/UUID del cliente</summary>
        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        /// <summary>Nombre de la empresa/cliente</summary>
        [JsonPropertyName("companyName")]
        public string CompanyName { get; set; } = string.Empty;

        /// <summary>Nombre del producto licenciado</summary>
        [JsonPropertyName("product")]
        public string Product { get; set; } = string.Empty;

        /// <summary>Numero maximo de usuarios permitidos</summary>
        [JsonPropertyName("maxUsers")]
        public int MaxUsers { get; set; } = 1;

        /// <summary>Fecha de expiracion en ISO 8601 (puede ser null si no expira)</summary>
        [JsonPropertyName("expiresAt")]
        public string? ExpiresAt { get; set; }

        /// <summary>Fecha de emision en ISO 8601</summary>
        [JsonPropertyName("issuedAt")]
        public string IssuedAt { get; set; } = string.Empty;

        /// <summary>ID unico de la licencia</summary>
        [JsonPropertyName("licenseId")]
        public string LicenseId { get; set; } = string.Empty;

        /// <summary>Clave de la licencia</summary>
        [JsonPropertyName("licenseKey")]
        public string LicenseKey { get; set; } = string.Empty;

        // Propiedades de conveniencia (no parte del JSON)
        [JsonIgnore]
        public DateTime? ExpiresAtDate => ExpiresAt != null ? DateTime.Parse(ExpiresAt).ToUniversalTime() : null;

        [JsonIgnore]
        public DateTime IssuedAtDate => DateTime.Parse(IssuedAt).ToUniversalTime();
    }

    /// <summary>
    /// Resultado de la validacion de licencia
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
    /// Validador de licencias offline usando RSA-SHA256.
    /// El token es un Base64 que contiene un JSON con { data, signature, algorithm, version }.
    /// La firma fue creada sobre JSON.stringify(data) con clave privada PKCS8.
    /// La verificacion usa la clave publica SPKI en formato PEM.
    /// </summary>
    public class LicenseValidator : IDisposable
    {
        private readonly RSA _rsa;

        /// <summary>
        /// Clave publica RSA en formato PEM (SPKI).
        /// IMPORTANTE: Reemplaza este valor con tu clave publica real.
        /// Obtener de: GET /api/licenses/offline/public-key
        /// </summary>
        private const string PUBLIC_KEY_PEM = @"-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA... TU CLAVE PUBLICA AQUI ...
-----END PUBLIC KEY-----";

        public LicenseValidator()
        {
            _rsa = RSA.Create();
            _rsa.ImportFromPem(PUBLIC_KEY_PEM);
        }

        /// <summary>
        /// Constructor alternativo que acepta la clave publica como parametro
        /// </summary>
        public LicenseValidator(string publicKeyPem)
        {
            _rsa = RSA.Create();
            _rsa.ImportFromPem(publicKeyPem);
        }

        /// <summary>
        /// Valida un token de licencia offline.
        ///
        /// Formato del token:
        ///   base64( JSON({ data: {...}, signature: "base64", algorithm: "RSA-SHA256", version: 1 }) )
        ///
        /// La firma fue creada sobre: UTF8.GetBytes(JSON.stringify(data))
        /// </summary>
        public LicenseValidationResult ValidateToken(string token)
        {
            try
            {
                // 1. Decodificar el Base64 para obtener el JSON del token completo
                string tokenJson;
                try
                {
                    tokenJson = Encoding.UTF8.GetString(Convert.FromBase64String(token));
                }
                catch (FormatException)
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Token malformado: no es un Base64 valido."
                    };
                }

                // 2. Parsear el JSON usando JsonDocument para preservar el JSON crudo de "data"
                using var doc = JsonDocument.Parse(tokenJson);
                var root = doc.RootElement;

                // 3. Verificar version
                if (!root.TryGetProperty("version", out var versionElement) || versionElement.GetInt32() != 1)
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Version de token no soportada. Se requiere version 1."
                    };
                }

                // 4. Extraer la firma
                if (!root.TryGetProperty("signature", out var signatureElement))
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Token sin firma: falta el campo 'signature'."
                    };
                }
                var signatureBase64 = signatureElement.GetString() ?? string.Empty;
                byte[] signatureBytes;
                try
                {
                    signatureBytes = Convert.FromBase64String(signatureBase64);
                }
                catch (FormatException)
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Firma malformada: no es un Base64 valido."
                    };
                }

                // 5. Extraer el JSON crudo de "data" — es exactamente lo que se firmo en el servidor
                if (!root.TryGetProperty("data", out var dataElement))
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Token invalido: falta el campo 'data'."
                    };
                }
                // Usar el JSON crudo del campo data para reproducir exactamente lo que se firmo
                var rawDataJson = dataElement.GetRawText();
                var dataBytes = Encoding.UTF8.GetBytes(rawDataJson);

                // 6. Verificar la firma RSA-SHA256
                var isSignatureValid = _rsa.VerifyData(
                    dataBytes,
                    signatureBytes,
                    HashAlgorithmName.SHA256,
                    RSASignaturePadding.Pkcs1
                );

                if (!isSignatureValid)
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Firma invalida. El token ha sido manipulado o es falso."
                    };
                }

                // 7. Deserializar el payload
                var license = JsonSerializer.Deserialize<OfflineLicensePayload>(rawDataJson);
                if (license == null)
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = "No se pudo deserializar el payload de la licencia."
                    };
                }

                // 8. Verificar expiracion
                var now = DateTime.UtcNow;
                var isExpired = license.ExpiresAtDate.HasValue && license.ExpiresAtDate.Value < now;
                var daysUntilExpiration = license.ExpiresAtDate.HasValue
                    ? (int)(license.ExpiresAtDate.Value - now).TotalDays
                    : int.MaxValue;

                if (isExpired)
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        IsExpired = true,
                        ErrorMessage = $"La licencia expiro el {license.ExpiresAtDate:yyyy-MM-dd}",
                        License = license,
                        DaysUntilExpiration = daysUntilExpiration
                    };
                }

                // 9. Licencia valida
                return new LicenseValidationResult
                {
                    IsValid = true,
                    License = license,
                    IsExpired = false,
                    DaysUntilExpiration = daysUntilExpiration
                };
            }
            catch (JsonException ex)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    ErrorMessage = $"Error al parsear JSON del token: {ex.Message}"
                };
            }
            catch (CryptographicException ex)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    ErrorMessage = $"Error criptografico: {ex.Message}"
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
        /// Valida el token y lanza excepcion si no es valido
        /// </summary>
        public OfflineLicensePayload ValidateTokenOrThrow(string token)
        {
            var result = ValidateToken(token);
            if (!result.IsValid)
                throw new LicenseValidationException(result.ErrorMessage ?? "Licencia invalida");
            return result.License!;
        }

        public void Dispose()
        {
            _rsa?.Dispose();
        }
    }

    /// <summary>
    /// Excepcion lanzada cuando la validacion de licencia falla
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

namespace YourNamespace.Licensing
{
    /// <summary>
    /// Gestor de licencias que maneja almacenamiento y validacion
    /// </summary>
    public class LicenseManager
    {
        private readonly LicenseValidator _validator;
        private readonly string _licensePath;
        private OfflineLicensePayload? _currentLicense;
        private string? _currentToken;

        /// <summary>Evento disparado cuando la licencia cambia</summary>
        public event EventHandler<OfflineLicensePayload?>? LicenseChanged;

        /// <summary>Licencia actual cargada</summary>
        public OfflineLicensePayload? CurrentLicense => _currentLicense;

        /// <summary>Indica si hay una licencia valida cargada</summary>
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

        /// <summary>Carga la licencia desde el archivo almacenado</summary>
        public LicenseValidationResult LoadLicense()
        {
            if (!File.Exists(_licensePath))
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "No se encontro archivo de licencia."
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
        /// <param name="token">Token de licencia offline (Base64)</param>
        /// <param name="saveToFile">Si es true, guarda el token en disco</param>
        public LicenseValidationResult ActivateLicense(string token, bool saveToFile = true)
        {
            var result = _validator.ValidateToken(token);

            if (result.IsValid)
            {
                _currentLicense = result.License;
                _currentToken = token;

                if (saveToFile)
                    SaveTokenToFile(token);

                LicenseChanged?.Invoke(this, _currentLicense);
            }

            return result;
        }

        /// <summary>Revalida la licencia actual (util para verificar expiracion)</summary>
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

        /// <summary>Elimina la licencia actual</summary>
        public void RemoveLicense()
        {
            _currentLicense = null;
            _currentToken = null;

            if (File.Exists(_licensePath))
                File.Delete(_licensePath);

            LicenseChanged?.Invoke(this, null);
        }

        /// <summary>Verifica si el producto especifico esta licenciado</summary>
        public bool IsProductLicensed(string productName)
        {
            return _currentLicense != null &&
                   _currentLicense.Product.Equals(productName, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>Verifica si hay suficientes usuarios permitidos</summary>
        public bool HasSufficientUsers(int requiredUsers)
        {
            return _currentLicense != null && _currentLicense.MaxUsers >= requiredUsers;
        }

        /// <summary>Obtiene los dias restantes hasta la expiracion</summary>
        public int GetDaysUntilExpiration()
        {
            if (_currentLicense?.ExpiresAtDate == null)
                return int.MaxValue;

            return (int)(_currentLicense.ExpiresAtDate.Value - DateTime.UtcNow).TotalDays;
        }

        private void SaveTokenToFile(string token)
        {
            var directory = Path.GetDirectoryName(_licensePath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                Directory.CreateDirectory(directory);

            File.WriteAllText(_licensePath, token);
        }
    }
}
```

---

## 3. Ejemplos de Uso

### 3.1. Validacion Simple

```csharp
using YourNamespace.Licensing;

// Token obtenido del panel de administracion (es un string Base64)
string token = "eyJkYXRhIjp7ImNvZGUiOiI...";

var validator = new LicenseValidator();
var result = validator.ValidateToken(token);

if (result.IsValid)
{
    Console.WriteLine($"Licencia valida para: {result.License.CompanyName}");
    Console.WriteLine($"Codigo de cliente: {result.License.Code}");
    Console.WriteLine($"Producto: {result.License.Product}");
    Console.WriteLine($"Usuarios maximos: {result.License.MaxUsers}");
    Console.WriteLine($"Expira en: {result.DaysUntilExpiration} dias");
}
else
{
    Console.WriteLine($"Licencia invalida: {result.ErrorMessage}");
}
```

### 3.2. Usando LicenseManager en una Aplicacion

```csharp
using YourNamespace.Licensing;

public class App
{
    private static readonly LicenseManager _licenseManager = new LicenseManager();

    public static void Main(string[] args)
    {
        var loadResult = _licenseManager.LoadLicense();

        if (!loadResult.IsValid)
        {
            Console.WriteLine("No hay licencia valida. Por favor ingrese su token de licencia:");
            var token = Console.ReadLine();

            var activationResult = _licenseManager.ActivateLicense(token);

            if (!activationResult.IsValid)
            {
                Console.WriteLine($"Error: {activationResult.ErrorMessage}");
                return;
            }
        }

        var license = _licenseManager.CurrentLicense!;
        Console.WriteLine($"Bienvenido, {license.CompanyName}!");
        Console.WriteLine($"Plan: {license.Product}");

        if (!_licenseManager.HasSufficientUsers(10))
            Console.WriteLine("Su licencia no permite 10 usuarios simultaneos.");

        var daysLeft = _licenseManager.GetDaysUntilExpiration();
        if (daysLeft < 30)
            Console.WriteLine($"ADVERTENCIA: Su licencia expira en {daysLeft} dias.");
    }
}
```

### 3.3. En una Aplicacion WPF/WinForms

```csharp
public partial class MainWindow : Window
{
    private readonly LicenseManager _licenseManager;

    public MainWindow()
    {
        InitializeComponent();

        _licenseManager = new LicenseManager();
        _licenseManager.LicenseChanged += OnLicenseChanged;

        var result = _licenseManager.LoadLicense();
        if (!result.IsValid)
            ShowLicenseActivationDialog();
    }

    private void OnLicenseChanged(object? sender, OfflineLicensePayload? license)
    {
        if (license != null)
        {
            StatusLabel.Content = $"Licenciado a: {license.CompanyName}";
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

### 3.4. Dialogo de Activacion (WPF)

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
                $"Licencia activada exitosamente!\n\n" +
                $"Empresa: {result.License.CompanyName}\n" +
                $"Producto: {result.License.Product}\n" +
                $"Usuarios: {result.License.MaxUsers}",
                "Exito",
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

## 4. Obtener la Clave Publica

### Opcion A: Desde el API (recomendado para desarrollo)

```bash
curl https://tu-api.com/api/licenses/offline/public-key
```

Respuesta:

```json
{
  "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBI...\n-----END PUBLIC KEY-----",
  "algorithm": "RSA-SHA256",
  "format": "PEM (SPKI)"
}
```

La clave esta en formato **SPKI PEM**, compatible directo con `RSA.ImportFromPem()` en .NET 5+.

### Opcion B: Incrustar en el codigo

Copia el valor de `publicKey` y reemplaza `PUBLIC_KEY_PEM` en `LicenseValidator.cs`.

### Opcion C: Configurar en appsettings.json (Recomendado para .NET Core Web API)

#### Paso 1: Agregar la clave en appsettings.json

```json
{
  "LicenseValidation": {
    "PublicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----"
  }
}
```

#### Paso 2: Crear clase de configuracion

```csharp
namespace YourNamespace.Configuration
{
    public class LicenseValidationSettings
    {
        public string PublicKey { get; set; } = string.Empty;
    }
}
```

#### Paso 3: Registrar en Program.cs (.NET 6+)

```csharp
using Microsoft.Extensions.Options;
using YourNamespace.Configuration;
using YourNamespace.Licensing;

builder.Services.Configure<LicenseValidationSettings>(
    builder.Configuration.GetSection("LicenseValidation"));

builder.Services.AddSingleton<LicenseValidator>(sp =>
{
    var settings = sp.GetRequiredService<IOptions<LicenseValidationSettings>>().Value;
    var publicKey = settings.PublicKey.Replace("\\n", "\n");
    return new LicenseValidator(publicKey);
});
```

#### Paso 4: Usar en un Controller

```csharp
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
            return BadRequest(new { error = result.ErrorMessage, isExpired = result.IsExpired });

        return Ok(new
        {
            valid = true,
            company = result.License.CompanyName,
            clientCode = result.License.Code,
            product = result.License.Product,
            maxUsers = result.License.MaxUsers,
            expiresAt = result.License.ExpiresAt,
            daysRemaining = result.DaysUntilExpiration
        });
    }
}
```

#### Paso 5: Middleware de Validacion con Cache (.NET 9)

```csharp
using Microsoft.Extensions.Caching.Memory;

public class LicenseValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly LicenseValidator _licenseValidator;
    private readonly IMemoryCache _cache;
    private const string LICENSE_CACHE_KEY = "LicenseValidationResult";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public LicenseValidationMiddleware(
        RequestDelegate next,
        LicenseValidator licenseValidator,
        IMemoryCache cache)
    {
        _next = next;
        _licenseValidator = licenseValidator;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";
        if (path.Contains("/health") || path.Contains("/swagger"))
        {
            await _next(context);
            return;
        }

        var token = context.Request.Headers["X-License-Token"].FirstOrDefault()
            ?? context.RequestServices.GetService<IConfiguration>()?["LicenseToken"];

        if (string.IsNullOrEmpty(token))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "License token required" });
            return;
        }

        var cacheKey = $"{LICENSE_CACHE_KEY}_{token.GetHashCode()}";

        if (!_cache.TryGetValue(cacheKey, out LicenseValidationResult? cachedResult))
        {
            cachedResult = _licenseValidator.ValidateToken(token);

            if (cachedResult.IsValid)
            {
                _cache.Set(cacheKey, cachedResult, new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(CacheDuration)
                    .SetSlidingExpiration(TimeSpan.FromMinutes(1)));
            }
        }

        if (!cachedResult!.IsValid)
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new {
                error = cachedResult.ErrorMessage,
                isExpired = cachedResult.IsExpired
            });
            return;
        }

        // Verificar expiracion en cada request (solo compara fechas, muy rapido)
        if (cachedResult.License?.ExpiresAtDate < DateTime.UtcNow)
        {
            _cache.Remove(cacheKey);
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new {
                error = "License has expired",
                isExpired = true,
                expiredAt = cachedResult.License.ExpiresAt
            });
            return;
        }

        context.Items["License"] = cachedResult.License;
        context.Items["LicenseDaysRemaining"] = cachedResult.DaysUntilExpiration;

        await _next(context);
    }
}

public static class LicenseValidationMiddlewareExtensions
{
    public static IApplicationBuilder UseLicenseValidation(this IApplicationBuilder builder)
        => builder.UseMiddleware<LicenseValidationMiddleware>();
}
```

#### Paso 6: Program.cs completo (.NET 9)

```csharp
builder.Services.AddMemoryCache();

builder.Services.Configure<LicenseValidationSettings>(
    builder.Configuration.GetSection("LicenseValidation"));

builder.Services.AddSingleton<LicenseValidator>(sp =>
{
    var settings = sp.GetRequiredService<IOptions<LicenseValidationSettings>>().Value;
    return new LicenseValidator(settings.PublicKey.Replace("\\n", "\n"));
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
app.UseLicenseValidation(); // Antes de authorization
app.UseAuthorization();
app.MapControllers();
app.Run();
```

#### Paso 7: Helper para acceder a la licencia en Controllers

```csharp
public static class HttpContextLicenseExtensions
{
    public static OfflineLicensePayload? GetLicense(this HttpContext context)
        => context.Items["License"] as OfflineLicensePayload;

    public static int GetLicenseDaysRemaining(this HttpContext context)
        => context.Items["LicenseDaysRemaining"] as int? ?? 0;
}

[ApiController]
[Route("api/[controller]")]
public class ProductController : ControllerBase
{
    [HttpGet]
    public IActionResult GetProducts()
    {
        var license = HttpContext.GetLicense();

        return Ok(new
        {
            message = $"Bienvenido {license?.CompanyName}",
            maxUsers = license?.MaxUsers,
            daysRemaining = HttpContext.GetLicenseDaysRemaining()
        });
    }
}
```

---

## 5. Instrucciones para el LLM

### Pasos de Implementacion:

1. **Crear los archivos**: Crea `LicenseValidator.cs` y `LicenseManager.cs` en una carpeta `Licensing/` del proyecto.

2. **Cambiar el namespace**: Reemplaza `YourNamespace` por el namespace real del proyecto.

3. **Configurar la clave publica**:
   - Obtener con HTTP GET a `/api/licenses/offline/public-key` (campo `publicKey` de la respuesta)
   - Incrustar en `PUBLIC_KEY_PEM` o configurar en `appsettings.json`

4. **Configurar la ruta del archivo de licencia**: Cambiar `"YourAppName"` en `LicenseManager.cs`.

5. **Integrar en el startup**:
   - Crear instancia de `LicenseManager`
   - Llamar `LoadLicense()` al inicio
   - Mostrar UI de activacion si no hay licencia valida

6. **Proteger caracteristicas premium**: Usar `_licenseManager.HasValidLicense` o `_licenseManager.IsProductLicensed("NombreProducto")`.

### Consideraciones Criticas:

- El token es un **unico string Base64** (no tiene formato `a.b`)
- El token decodificado es un JSON con campos: `data`, `signature`, `algorithm`, `version`
- La firma se verifica sobre el JSON crudo del campo `data` (no sobre una re-serializacion)
- Los campos del payload son `code` y `companyName` (NO `clientId` ni `clientName`)
- `expiresAt` es un string ISO 8601 o `null` (no un `DateTime`)
- La clave publica esta en formato SPKI PEM — compatible directo con `RSA.ImportFromPem()`
- Compatible con **.NET 5+** (usa `ImportFromPem` disponible desde .NET 5)

---

## 6. Version para .NET Framework 4.x

Si el proyecto usa .NET Framework 4.x, `ImportFromPem` no esta disponible. Usar BouncyCastle:

```bash
Install-Package BouncyCastle.Cryptography
```

```csharp
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.OpenSsl;
using Org.BouncyCastle.Security;

public LicenseValidator(string publicKeyPem)
{
    using var reader = new StringReader(publicKeyPem);
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

## 7. Proteccion Anti-Manipulacion de Fecha del Sistema

### 7.1. Guardar Ultima Fecha Conocida (Recomendado)

```csharp
using System;
using System.IO;
using System.Text.Json;

namespace YourNamespace.Licensing
{
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

        public DateTime? GetSecureCurrentTime()
        {
            var currentTime = DateTime.UtcNow;

            if (currentTime < _lastKnownTime.AddMinutes(-5))
                return null; // Manipulacion detectada

            UpdateLastKnownTime(currentTime);
            return currentTime;
        }

        public bool IsClockTampered() => GetSecureCurrentTime() == null;

        public DateTime LastKnownTime => _lastKnownTime;

        private void LoadLastKnownTime()
        {
            try
            {
                if (File.Exists(_timeFilePath))
                {
                    var data = JsonSerializer.Deserialize<TimeData>(File.ReadAllText(_timeFilePath));
                    if (data != null)
                    {
                        _lastKnownTime = DateTime.FromBinary(data.Ticks);
                        return;
                    }
                }
            }
            catch { }

            _lastKnownTime = DateTime.UtcNow;
            UpdateLastKnownTime(_lastKnownTime);
        }

        private void UpdateLastKnownTime(DateTime time)
        {
            try
            {
                var directory = Path.GetDirectoryName(_timeFilePath);
                if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                    Directory.CreateDirectory(directory);

                File.WriteAllText(_timeFilePath, JsonSerializer.Serialize(new TimeData { Ticks = time.ToBinary() }));
                File.SetAttributes(_timeFilePath, FileAttributes.Hidden | FileAttributes.System);
                _lastKnownTime = time;
            }
            catch { }
        }

        private class TimeData { public long Ticks { get; set; } }
    }
}
```

### 7.2. Integrar en LicenseValidator

Agrega `SecureTimeTracker` al constructor y sustituye `DateTime.UtcNow` por `secureTime.Value` en la verificacion de expiracion:

```csharp
public class LicenseValidator : IDisposable
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
        // 0. Verificar manipulacion del reloj PRIMERO
        var secureTime = _timeTracker.GetSecureCurrentTime();
        if (secureTime == null)
        {
            return new LicenseValidationResult
            {
                IsValid = false,
                ErrorMessage = $"Se detecto manipulacion del reloj del sistema. " +
                    $"Ultima fecha valida: {_timeTracker.LastKnownTime:yyyy-MM-dd HH:mm}."
            };
        }

        // ... resto de la validacion usando secureTime.Value en lugar de DateTime.UtcNow ...
    }
}
```

---

## 8. Testing

```csharp
[TestClass]
public class LicenseValidatorTests
{
    // Obtener un token real del panel de administracion para las pruebas
    private const string VALID_TOKEN = "tu-token-de-prueba-aqui";
    private const string TAMPERED_TOKEN = "eyJkYXRhIjp7ImNvZGUiOiJ0ZXN0In0sInNpZ25hdHVyZSI6ImludmFsaWQiLCJhbGdvcml0aG0iOiJSU0EtU0hBMjU2IiwidmVyc2lvbiI6MX0=";

    [TestMethod]
    public void ValidateToken_WithValidToken_ReturnsValid()
    {
        var validator = new LicenseValidator();
        var result = validator.ValidateToken(VALID_TOKEN);

        Assert.IsTrue(result.IsValid);
        Assert.IsNotNull(result.License);
        Assert.IsFalse(string.IsNullOrEmpty(result.License.CompanyName));
        Assert.IsFalse(string.IsNullOrEmpty(result.License.Code));
    }

    [TestMethod]
    public void ValidateToken_WithTamperedToken_ReturnsInvalid()
    {
        var validator = new LicenseValidator();
        var result = validator.ValidateToken(TAMPERED_TOKEN);

        Assert.IsFalse(result.IsValid);
        Assert.IsTrue(result.ErrorMessage!.Contains("Firma invalida") ||
                      result.ErrorMessage.Contains("error"));
    }

    [TestMethod]
    public void ValidateToken_WithInvalidBase64_ReturnsInvalid()
    {
        var validator = new LicenseValidator();
        var result = validator.ValidateToken("esto-no-es-base64-valido!!!");

        Assert.IsFalse(result.IsValid);
        Assert.IsTrue(result.ErrorMessage!.Contains("malformado"));
    }

    [TestMethod]
    public void ValidateToken_WithEmptyToken_ReturnsInvalid()
    {
        var validator = new LicenseValidator();
        var result = validator.ValidateToken("");

        Assert.IsFalse(result.IsValid);
    }
}
```

---

## Resumen

### Formato Real del Token

```
TOKEN = Base64( JSON({ data, signature, algorithm, version }) )
```

Donde:
- `data` = objeto `OfflineLicensePayload` con los datos de la licencia
- `signature` = firma RSA-SHA256 en Base64 de `JSON.stringify(data)`
- `algorithm` = `"RSA-SHA256"`
- `version` = `1`

### Campos del Payload

| Campo         | Tipo              | Descripcion                        |
| ------------- | ----------------- | ---------------------------------- |
| `code`        | `string`          | UUID/identificador del cliente     |
| `companyName` | `string`          | Nombre de la empresa               |
| `product`     | `string`          | Nombre del producto                |
| `maxUsers`    | `number`          | Numero maximo de usuarios          |
| `expiresAt`   | `string` o `null` | Fecha ISO 8601 o null (sin vence.) |
| `issuedAt`    | `string`          | Fecha de emision ISO 8601          |
| `licenseId`   | `string`          | UUID de la licencia                |
| `licenseKey`  | `string`          | Clave de la licencia               |

### Clases C# Principales

| Clase                     | Uso Principal                                               |
| ------------------------- | ----------------------------------------------------------- |
| `LicenseValidator`        | `ValidateToken(token)` -> `LicenseValidationResult`         |
| `LicenseManager`          | `LoadLicense()`, `ActivateLicense(token)`, `CurrentLicense` |
| `OfflineLicensePayload`   | Datos de la licencia (`Code`, `CompanyName`, etc.)          |
| `LicenseValidationResult` | Resultado con `IsValid`, `License`, `ErrorMessage`          |

**El token es autonomo**: contiene todos los datos necesarios firmados criptograficamente. No se puede falsificar sin la clave privada del servidor.
