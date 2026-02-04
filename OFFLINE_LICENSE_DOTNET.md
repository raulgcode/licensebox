# Offline License Validation - .NET Implementation

Este documento contiene el código necesario para validar licencias offline en tu aplicación .NET Core.

## Estructura de la Licencia

El token de licencia es un string Base64 que contiene:

- **data**: Información de la licencia (código, empresa, producto, usuarios, expiración)
- **signature**: Firma RSA-SHA256 de los datos
- **algorithm**: "RSA-SHA256"
- **version**: 1

## Instalación

No se requieren paquetes NuGet adicionales. Usa las librerías nativas de .NET.

## Código C# para Validación

### 1. Modelo de Datos

```csharp
using System;
using System.Text.Json.Serialization;

namespace YourApp.Licensing
{
    /// <summary>
    /// Payload de la licencia con toda la información del cliente
    /// </summary>
    public class OfflineLicensePayload
    {
        /// <summary>Código identificador del cliente</summary>
        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        /// <summary>Nombre de la empresa/cliente</summary>
        [JsonPropertyName("companyName")]
        public string CompanyName { get; set; } = string.Empty;

        /// <summary>Nombre del producto</summary>
        [JsonPropertyName("product")]
        public string Product { get; set; } = string.Empty;

        /// <summary>Número máximo de usuarios permitidos</summary>
        [JsonPropertyName("maxUsers")]
        public int MaxUsers { get; set; }

        /// <summary>Fecha de expiración (ISO 8601) o null si no expira</summary>
        [JsonPropertyName("expiresAt")]
        public string? ExpiresAt { get; set; }

        /// <summary>Fecha de emisión (ISO 8601)</summary>
        [JsonPropertyName("issuedAt")]
        public string IssuedAt { get; set; } = string.Empty;

        /// <summary>ID único de la licencia</summary>
        [JsonPropertyName("licenseId")]
        public string LicenseId { get; set; } = string.Empty;

        /// <summary>Clave de la licencia</summary>
        [JsonPropertyName("licenseKey")]
        public string LicenseKey { get; set; } = string.Empty;
    }

    /// <summary>
    /// Token completo de licencia offline
    /// </summary>
    public class OfflineLicenseToken
    {
        [JsonPropertyName("data")]
        public OfflineLicensePayload Data { get; set; } = new();

        [JsonPropertyName("signature")]
        public string Signature { get; set; } = string.Empty;

        [JsonPropertyName("algorithm")]
        public string Algorithm { get; set; } = string.Empty;

        [JsonPropertyName("version")]
        public int Version { get; set; }
    }

    /// <summary>
    /// Resultado de la validación de licencia
    /// </summary>
    public class LicenseValidationResult
    {
        public bool IsValid { get; set; }
        public bool IsExpired { get; set; }
        public string Message { get; set; } = string.Empty;
        public OfflineLicensePayload? Payload { get; set; }
    }
}
```

### 2. Servicio de Validación de Licencias

```csharp
using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace YourApp.Licensing
{
    /// <summary>
    /// Servicio para validar licencias offline sin conexión al servidor
    /// </summary>
    public class LicenseValidator
    {
        // ⚠️ IMPORTANTE: Reemplaza esto con tu clave pública real
        // Obtén esta clave del endpoint: GET /licenses/offline/public-key
        private const string PublicKeyPem = @"-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA... TU CLAVE PUBLICA AQUÍ ...
-----END PUBLIC KEY-----";

        private readonly RSA _rsa;

        public LicenseValidator()
        {
            _rsa = RSA.Create();
            _rsa.ImportFromPem(PublicKeyPem);
        }

        /// <summary>
        /// Valida un token de licencia offline
        /// </summary>
        /// <param name="licenseToken">Token base64 de la licencia</param>
        /// <returns>Resultado de la validación</returns>
        public LicenseValidationResult ValidateLicense(string licenseToken)
        {
            try
            {
                // 1. Decodificar el token de Base64
                var tokenJson = Encoding.UTF8.GetString(Convert.FromBase64String(licenseToken));

                // 2. Deserializar el token
                var token = JsonSerializer.Deserialize<OfflineLicenseToken>(tokenJson);

                if (token == null)
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        Message = "Token de licencia inválido"
                    };
                }

                // 3. Verificar versión
                if (token.Version != 1)
                {
                    return new LicenseValidationResult
                    {
                        IsValid = false,
                        Message = "Versión de token no soportada"
                    };
                }

                // 4. Recrear el string de datos para verificar la firma
                var dataJson = JsonSerializer.Serialize(token.Data, new JsonSerializerOptions
                {
                    // Importante: usar las mismas opciones que el servidor
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                });
                var dataBytes = Encoding.UTF8.GetBytes(dataJson);

                // 5. Verificar la firma RSA-SHA256
                var signatureBytes = Convert.FromBase64String(token.Signature);
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
                        Message = "Firma de licencia inválida - la licencia puede haber sido manipulada"
                    };
                }

                // 6. Verificar expiración
                if (!string.IsNullOrEmpty(token.Data.ExpiresAt))
                {
                    var expirationDate = DateTime.Parse(token.Data.ExpiresAt);
                    if (expirationDate < DateTime.UtcNow)
                    {
                        return new LicenseValidationResult
                        {
                            IsValid = false,
                            IsExpired = true,
                            Message = $"La licencia expiró el {expirationDate:yyyy-MM-dd}",
                            Payload = token.Data
                        };
                    }
                }

                // 7. Licencia válida
                return new LicenseValidationResult
                {
                    IsValid = true,
                    IsExpired = false,
                    Message = "Licencia válida",
                    Payload = token.Data
                };
            }
            catch (FormatException)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    Message = "Formato de licencia inválido"
                };
            }
            catch (JsonException)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    Message = "Error al parsear la licencia"
                };
            }
            catch (CryptographicException)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    Message = "Error de verificación criptográfica"
                };
            }
            catch (Exception ex)
            {
                return new LicenseValidationResult
                {
                    IsValid = false,
                    Message = $"Error inesperado: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Verifica si el número de usuarios actuales excede el límite de la licencia
        /// </summary>
        public bool IsUserLimitExceeded(OfflineLicensePayload payload, int currentUsers)
        {
            return currentUsers > payload.MaxUsers;
        }
    }
}
```

### 3. Ejemplo de Uso

```csharp
using System;
using YourApp.Licensing;

namespace YourApp
{
    public class Program
    {
        public static void Main(string[] args)
        {
            // El token de licencia que el usuario copia y pega en la aplicación
            string licenseToken = "eyJkYXRhIjp7ImNvZGUiOiJjbGllbnQtaWQi...";

            var validator = new LicenseValidator();
            var result = validator.ValidateLicense(licenseToken);

            if (result.IsValid)
            {
                Console.WriteLine("✅ Licencia válida!");
                Console.WriteLine($"   Empresa: {result.Payload?.CompanyName}");
                Console.WriteLine($"   Producto: {result.Payload?.Product}");
                Console.WriteLine($"   Usuarios máximos: {result.Payload?.MaxUsers}");

                if (!string.IsNullOrEmpty(result.Payload?.ExpiresAt))
                {
                    Console.WriteLine($"   Expira: {result.Payload?.ExpiresAt}");
                }
                else
                {
                    Console.WriteLine("   Licencia perpetua (sin expiración)");
                }

                // Verificar límite de usuarios
                int usuariosActuales = 10;
                if (validator.IsUserLimitExceeded(result.Payload!, usuariosActuales))
                {
                    Console.WriteLine($"⚠️  Límite de usuarios excedido ({usuariosActuales}/{result.Payload?.MaxUsers})");
                }
            }
            else
            {
                Console.WriteLine($"❌ Licencia inválida: {result.Message}");

                if (result.IsExpired)
                {
                    Console.WriteLine("   La licencia ha expirado. Por favor, renueve su suscripción.");
                }

                // Bloquear funcionalidad
                Environment.Exit(1);
            }
        }
    }
}
```

### 4. Integración en Startup (ASP.NET Core)

```csharp
using Microsoft.Extensions.DependencyInjection;
using YourApp.Licensing;

public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        // Registrar el validador como singleton
        services.AddSingleton<LicenseValidator>();

        // ... otros servicios
    }
}
```

### 5. Middleware de Validación (Opcional)

```csharp
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace YourApp.Licensing
{
    public class LicenseValidationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly LicenseValidator _validator;
        private readonly string _licenseToken;

        public LicenseValidationMiddleware(
            RequestDelegate next,
            LicenseValidator validator,
            IConfiguration configuration)
        {
            _next = next;
            _validator = validator;
            _licenseToken = configuration["License:Token"] ?? string.Empty;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var result = _validator.ValidateLicense(_licenseToken);

            if (!result.IsValid)
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "Licencia inválida",
                    message = result.Message,
                    expired = result.IsExpired
                });
                return;
            }

            // Guardar info de licencia en el contexto para uso posterior
            context.Items["LicensePayload"] = result.Payload;

            await _next(context);
        }
    }
}
```

## Flujo de Trabajo

1. **Generar licencia en el servidor**:
   - POST `/licenses` con `generateOfflineToken: true`
   - O POST `/licenses/offline/generate` con el ID de una licencia existente

2. **Obtener clave pública** (una sola vez):
   - GET `/licenses/offline/public-key`
   - Copiar la clave pública a tu código .NET

3. **Distribuir licencia**:
   - Copiar el token generado
   - El cliente lo pega en su aplicación (configuración o UI)

4. **Validación offline**:
   - La aplicación .NET valida el token localmente
   - No requiere conexión a internet
   - Verifica firma y expiración

## Seguridad

- ✅ La **clave privada** se queda en el servidor (nunca se comparte)
- ✅ La **clave pública** se embebe en la aplicación cliente
- ✅ Los tokens no pueden ser falsificados sin la clave privada
- ✅ Los tokens no pueden ser modificados (la firma lo detectaría)
- ⚠️ Un usuario puede intentar modificar la fecha del sistema para evitar expiración
  - Considera usar validación online periódica si es crítico
  - O implementar verificación de tiempo con servidores NTP

## Variables de Entorno del Servidor

```bash
# Directorio para almacenar las claves (opcional)
LICENSE_KEY_DIR=./keys

# O usa variables de entorno en producción (las \n se reemplazan automáticamente)
LICENSE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIB..."
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjAN..."
```
