# Signature Approval Workflow

Prueba técnica fullstack: flujo de aprobación de solicitudes de compra con firma digital
concatenada de 3 aprobadores, verificación por OTP, y generación de evidencia en PDF.
Arquitectura serverless en AWS (Lambda + API Gateway + DynamoDB + S3).

## Estado actual

- **Backend**: completo (dominio, aplicación, infraestructura, handlers) y desplegado.
- **Frontend**: pendiente.

## Arquitectura

El backend (`backend/`) sigue arquitectura hexagonal, en capas independientes:

```
src/
  domain/            Entidades y reglas de negocio puras (sin dependencias externas)
    entities/          PurchaseRequest, Approval
    value-objects/     Otp
  application/        Casos de uso + puertos (interfaces)
    use-cases/           Un caso de uso por archivo, con su Input en use-cases/inputs/
    ports/               Interfaces que implementa infraestructura
    types/               DTOs internos compartidos entre casos de uso y sus puertos
  infraestructure/     Implementaciones reales de los puertos
    persistence/         DynamoPurchaseRequestRepository, DynamoMockMailStore
    notifications/       MockNotificationService
    pdf/                 PdfKitEvidenceGenerator
    storage/              S3EvidenceStorage
    mappers/              Conversión entre entidades de dominio y registros de DynamoDB
    config/               Validación de variables de entorno (zod)
    container.ts          Composition root: arma cada caso de uso con sus adaptadores reales
  handlers/            Un handler Lambda por endpoint (capa HTTP)
    schemas/              Validación de entrada (zod)
    dto/                  Serialización de salida (entidad de dominio → JSON de respuesta)
```

La regla de dependencia va en una sola dirección: `handlers → infraestructure → application → domain`.
El dominio no conoce nada de HTTP, AWS ni DynamoDB.

## Flujo funcional

1. El solicitante crea una solicitud de compra (título, descripción, monto, 3 aprobadores
   con roles distintos). Queda en estado `PENDING`.
2. Por cada aprobador se genera un token único (UUID) y un OTP (6 dígitos, válido 3
   minutos). Se envía (simulado) un correo con el link de aprobación y el código.
3. El aprobador abre su link (`GET /api/approvals/{id}/{token}`), y solo ve información
   mínima (su nombre, rol, y el título de la solicitud) junto con la pantalla para
   ingresar el OTP.
4. Ingresa el código (`POST /api/approvals/{id}/{token}/verify-otp`). Si es correcto,
   recién ahí se le muestra el detalle completo (monto, descripción, estado de las 3
   aprobaciones) y las opciones de aprobar/rechazar.
5. Al aprobar o rechazar (`POST .../sign` o `.../reject`) se vuelve a validar el mismo
   código — es la acción que realmente compromete, así que se protege de forma
   independiente del paso anterior.
6. Al firmar las 3 aprobaciones, se genera el PDF de evidencia, se sube a S3, y **recién
   ahí** el estado pasa a `COMPLETED` — no basta con que las 3 firmas existan, tiene que
   existir el PDF.
7. Si cualquier aprobador rechaza, la solicitud pasa a `REJECTED` y no admite más acciones.
8. El PDF queda disponible para descarga en `GET /api/solicitudes/{id}/evidencia.pdf`.

## Supuestos y decisiones tomadas

- **El OTP se genera una sola vez, al crear la solicitud, y no se regenera.** Vive
  exactamente 3 minutos desde ese momento, tal como pide el enunciado ("OTP válido por 3
  minutos"). No se implementó un mecanismo de reenvío/regeneración porque no está pedido
  explícitamente — se prefirió no agregar alcance no solicitado.
- **El OTP se revalida en cada acción que lo requiere, no se consume tras el primer uso.**
  `GET /api/approvals/{id}/{token}` (el link) solo devuelve info mínima (nombre/rol del
  aprobador, título de la solicitud) sin exponer el detalle. Recién
  `POST .../verify-otp` valida el código y, si es correcto, entrega el detalle completo
  (monto, descripción, estado de las 3 aprobaciones) — así se respeta la secuencia del
  enunciado (OTP correcto → se muestra el detalle). Firmar y rechazar (`POST .../sign` y
  `.../reject`) vuelven a pedir y validar el mismo código, en vez de confiar en que ya se
  verificó antes: es la acción que compromete legalmente, así que se protege de forma
  independiente, sin necesitar manejar sesión en un backend sin estado.
- **El estado "Completada" depende de la evidencia, no solo de las firmas.** Firmar las 3
  aprobaciones dispara la generación del PDF en la misma operación, pero el dominio no
  marca la solicitud como completada hasta que el PDF efectivamente se generó y se guardó
  — evita que quede "Completada" sin evidencia si la generación del PDF fallara.
- **Notificaciones simuladas persistidas en DynamoDB, no solo en log.** Se eligió guardar en DynamoDB (tabla aparte)
  y exponer `/mock-mail` porque es la opción que mejor funciona para simular el envio de notificaciones (en memoria no persiste entre invocaciones; leer CloudWatch Logs
  es más complejo que una consulta a una tabla).
- **Diseño de tabla DynamoDB de una sola entidad por tabla** Una tabla para solicitudes, otra para el log de correos simulados. Más
  simple de razonar y suficiente para el volumen de esta prueba.
- **Sin autenticación de "solicitante".** El enunciado no la pide; el panel lista todas las
  solicitudes.

## Decisiones de arquitectura

- **Serverless Framework como estrategia de IaC** (en vez de AWS CDK, SAM o Terraform). El
  enunciado pide explícitamente un enfoque serverless sobre Lambda/API
  Gateway/DynamoDB/S3, que es exactamente el caso de uso para el que Serverless Framework
  está diseñado: mapea 1:1 "función Lambda + evento HTTP + recursos" en un solo archivo
  declarativo, con packaging/bundling de Lambdas y `serverless-offline` para desarrollo
  local incluidos de fábrica. CDK es más flexible pero más código para el mismo resultado
  (uno termina definiendo a mano lo que Serverless ya resuelve con el bloque
  `functions`/`events`); Terraform es agnóstico de nube pero no tiene la misma integración
  directa con el empaquetado de Lambdas ni con eventos de API Gateway. Para el alcance de
  esta prueba (10 funciones detrás de rutas HTTP + 2 tablas + 1 bucket), Serverless
  Framework da el resultado más simple con menos configuración.
- **`serverless.ts` en vez de `serverless.yml`.** Al ser TypeScript, el archivo de
  configuración queda tipado contra el schema oficial (`@serverless/typescript`) — un
  typo en un evento o una propiedad mal escrita se detecta en `npm run typecheck`, antes
  de intentar desplegar, en vez de fallar recién contra AWS. También evita la sintaxis de
  variables propia de YAML (`${self:custom.x}`) para reusar valores como los nombres de
  las tablas: en TypeScript son simplemente constantes de JavaScript compartidas entre
  `provider.environment` y `resources`. Y mantiene todo el backend en un solo lenguaje.
- **API Gateway HTTP API (v2) en vez de REST API (v1).** Para este caso — proxy directo a
  Lambda con rutas y path params, sin necesidad de API keys, planes de uso, transformación
  de requests/responses (VTL), ni integración con WAF — HTTP API ofrece todo lo necesario
  con menor latencia y hasta ~70% menos costo que REST API. La respuesta binaria del PDF
  también funciona directo con el formato de payload 2.0 de HTTP API (`isBase64Encoded`),
  sin la configuración adicional de `binaryMediaTypes` que pide REST API.
- **El OTP como value object de dominio (`Otp`), no como campos sueltos.** Es un caso de
  manual de value object: no tiene identidad propia (dos OTP con el mismo código y
  vencimiento son intercambiables), es inmutable una vez creado, y encapsula su propia
  regla de negocio (`isValid`: coincide el código _y_ no venció). Si el código y la fecha
  de expiración fueran dos campos sueltos en `Approval`, esa regla se podría chequear de
  forma inconsistente en distintos lugares; como value object, la única forma de crear un
  `Otp` es a través de sus factory methods (`generate` para uno nuevo, `rehydrate` para
  reconstruir uno ya emitido al leerlo de DynamoDB) — el constructor es privado, así que
  no hay forma de crear uno con datos arbitrarios por accidente.

## Stack

- **Backend**: TypeScript, Node.js (`nodejs24.x` en Lambda), Serverless Framework v4.
- **Base de datos**: DynamoDB (`PAY_PER_REQUEST`).
- **Almacenamiento de evidencia**: S3.
- **Generación de PDF**: `pdfkit`.
- **Validación**: `zod`.
- **Tests**: `jest` + `ts-jest`.

## Requisitos previos

- Node.js 20+ y npm.
- Credenciales de AWS configuradas localmente (`~/.aws/credentials` o variables de entorno)
  para desplegar o para correr `serverless offline` contra los recursos reales.

## Cómo correr el backend

```bash
cd backend
npm install
```

**Autenticación (una sola vez):**

```bash
npx serverless login aws
npx serverless login
```

El primer comando conecta Serverless Framework con tu cuenta de AWS; el segundo inicia
sesión en Serverless Framework (requerido por la v4 para desplegar/operar). Sin esto,
tanto `serverless deploy` como `serverless offline` (que igual usa las tablas/bucket
reales) van a fallar al no poder resolver credenciales.

**Tests y cobertura:**

```bash
npm test              # suite completa
npm run test:coverage # con reporte de cobertura
npm run typecheck
npm run lint
```

**Local (serverless-offline):**

```bash
npm run start:serverless
```

Esto levanta API Gateway + Lambda emulados localmente en `http://localhost:3000`, pero los
handlers siguen usando el SDK real de AWS para DynamoDB/S3 — **serverless-offline no emula
esas capas**, así que los endpoints que tocan datos necesitan que las tablas/bucket ya
existan (ver Despliegue).

**Despliegue:**

```bash
npx serverless deploy
```

Crea (o actualiza) las 2 tablas DynamoDB, el bucket S3, el rol IAM, los 10 Lambdas y el API
Gateway. Cualquier cambio local requiere volver a desplegar para reflejarse en AWS.

## URL desplegada

```
https://qb8tt59p11.execute-api.us-east-1.amazonaws.com
```

(Stage `dev`, región `us-east-1`.)

## Endpoints

| Método | Ruta                                     | Descripción                                                                                         |
| ------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| GET    | `/health`                                | Chequeo de salud                                                                                    |
| POST   | `/api/solicitudes`                       | Crear solicitud de compra                                                                           |
| GET    | `/api/solicitudes`                       | Listar solicitudes                                                                                  |
| GET    | `/api/solicitudes/{id}`                  | Detalle de una solicitud                                                                            |
| GET    | `/api/solicitudes/{id}/evidencia.pdf`    | Descargar el PDF de evidencia                                                                       |
| GET    | `/api/approvals/{id}/{token}`            | Info mínima para un aprobador (vía link) — no expone monto/descripción todavía                      |
| POST   | `/api/approvals/{id}/{token}/verify-otp` | Verifica el OTP; si es correcto, devuelve el detalle completo (body: `{ "code": "123456" }`)        |
| POST   | `/api/approvals/{id}/{token}/sign`       | Firmar (body: `{ "code": "123456" }`)                                                               |
| POST   | `/api/approvals/{id}/{token}/reject`     | Rechazar (body: `{ "code": "123456" }`)                                                             |
| GET    | `/mock-mail`                             | Listar los correos simulados enviados (para obtener el token/OTP de cada aprobador sin correo real) |

Documentación OpenAPI/Swagger detallada (con ejemplos e instrucciones de prueba):
[`backend/openapi.yaml`](backend/openapi.yaml). Es un archivo estático, no se despliega —
se abre con cualquier visor de OpenAPI (extensión de VS Code, https://editor.swagger.io,
etc.).

## Pendiente

- Frontend (React + React Router + Webpack).
- Capturas de pantalla.
