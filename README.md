# Signature Approval Workflow

Prueba técnica fullstack: flujo de aprobación de solicitudes de compra con firma digital
concatenada de 3 aprobadores, verificación por OTP, y generación de evidencia en PDF.
Arquitectura serverless en AWS (Lambda + API Gateway + DynamoDB + S3) con un frontend de
micro-frontends (Webpack Module Federation).

## Backend

### Arquitectura

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

### Flujo funcional

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

### Supuestos y decisiones tomadas

- **El OTP se genera una sola vez, al crear la solicitud, y no se regenera.** Vive
  exactamente 3 minutos desde ese momento, tal como pide el enunciado ("OTP válido por 3
  minutos").
- **El OTP se revalida en cada acción que lo requiere, no se consume tras el primer uso.**
  `GET /api/approvals/{id}/{token}` (el link) solo devuelve info mínima (nombre/rol del
  aprobador, título de la solicitud) sin exponer el detalle.
  `POST .../verify-otp` valida el código y si es correcto, entrega el detalle completo
  (monto, descripción, estado de las 3 aprobaciones) — así se respeta la secuencia del
  enunciado (OTP correcto → se muestra el detalle). Firmar y rechazar (`POST .../sign` y
  `.../reject`) valida nuevamente el otp, en vez de confiar en que ya se
  verificó antes.
- **Por seguridad, la solicitud se rechaza automáticamente si el OTP vence sin uso, o si
  se agotan los intentos.** Cada aprobación admite máximo 3 intentos fallidos de OTP
  (`Approval.hasExceededOtpAttempts`); al superarlos, o si la ventana de 3 minutos pasó
  sin que nadie la usara (`Approval.hasOtpExpired`), la solicitud completa pasa a
  `REJECTED` — no queda una forma de reintentar, hay que crear una nueva. Esto cierra dos
  problemas a la vez: (1) sin límite de intentos, el OTP es forzable por fuerza bruta dentro de la ventana de 3 minutos si nadie
  frena los reintentos; (2) sin una salida ante el vencimiento, una solicitud podía quedar
  trabada para siempre si un aprobador simplemente no abría el link a tiempo (ninguna de
  las dos situaciones está cubierta por el enunciado). El chequeo de vencimiento se hace de forma perezosa (al abrir el
  link, o al intentar firmar/rechazar/verificar) en vez de con un proceso en segundo plano
  — no hace falta infraestructura adicional (cron, Step Functions) para algo que ya se
  evalúa en cada acceso.
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

### Decisiones de arquitectura

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
- **CORS restringido a orígenes explícitos, no `cors: true` (que permite cualquier
  origen).** `httpApi.cors.allowedOrigins` solo permite el dominio real del frontend
  desplegado (reusa la misma variable `FRONTEND_BASE_URL`, ver más abajo — un solo valor
  controla tanto el link de los correos como el origen permitido) más los 3 puertos de
  dev local del frontend (`localhost:3001/3002/3003`, ver Frontend → Puertos), para
  poder seguir corriendo el frontend en local contra este backend ya desplegado sin tener
  que levantar `serverless-offline`. Solo se permiten los métodos y el header que la app
  realmente usa (`GET`/`POST`, `Content-Type`) — no hay `Authorization` porque no hay
  autenticación.

### Stack

- **Backend**: TypeScript, Node.js (`nodejs24.x` en Lambda), Serverless Framework v4.
- **Base de datos**: DynamoDB (`PAY_PER_REQUEST`).
- **Almacenamiento de evidencia**: S3.
- **Generación de PDF**: `pdfkit`.
- **Validación**: `zod`.
- **Tests**: `jest` + `ts-jest`.

### Requisitos previos

- Node.js 20+ y npm.
- Credenciales de AWS configuradas localmente (`~/.aws/credentials` o variables de entorno)
  para desplegar o para correr `serverless offline` contra los recursos reales.

### Cómo correr el backend

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

**`FRONTEND_BASE_URL` también hace falta para este comando**, no solo para
`serverless deploy` — Serverless Framework resuelve todas las variables del archivo de
config al arrancar, sin importar qué comando se esté corriendo, y esa variable no tiene
valor por defecto (ver más abajo). Para desarrollo puramente local alcanza con cualquier
valor, por ejemplo:

```bash
FRONTEND_BASE_URL=http://localhost:3001 npm run start:serverless
```

**Despliegue:**

```bash
npx serverless deploy
```

Crea (o actualiza) las 2 tablas DynamoDB, el bucket S3, el rol IAM, los 10 Lambdas y el API
Gateway. Cualquier cambio local requiere volver a desplegar para reflejarse en AWS.

**`FRONTEND_BASE_URL`**: el dominio del frontend real. Se usa para dos cosas: (1) el link
que el backend embebe en cada correo simulado (`GET /mock-mail`), y (2) el origen
permitido en CORS (`httpApi.cors.allowedOrigins`, ver "Decisiones de arquitectura" más
arriba) — un solo valor para ambas, ya que en la práctica siempre deben ser el mismo
dominio. Es **obligatoria, sin valor por defecto** — cualquier comando de Serverless
Framework (`deploy`, pero también `offline`, `print`, `info`, etc.) falla si no está
seteada. Por eso, para un despliegue desde cero, conviene desplegar primero la
infraestructura del frontend (que no depende de nada del backend, ver Frontend →
Despliegue) para tener ya el dominio de CloudFront antes de tocar el backend:

```bash
FRONTEND_BASE_URL=https://<CloudFrontDomain> npx serverless deploy
```

(en PowerShell: `$env:FRONTEND_BASE_URL="https://<CloudFrontDomain>"; npx serverless deploy`).
`MockMailPage` en el frontend no depende de este valor para funcionar (reconstruye el link
real a partir del `requestId`/`token` del correo, ver Frontend → Decisiones de
arquitectura) — pero cualquier link que se copie directamente del texto del correo sí lo
necesita para apuntar al sitio real, y las llamadas del frontend al backend lo necesitan
para no ser bloqueadas por CORS.

### URL desplegada

```
https://qb8tt59p11.execute-api.us-east-1.amazonaws.com
```

(Stage `dev`, región `us-east-1`.)

### Endpoints

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

## Frontend

### Arquitectura

El frontend (`frontend/`) es un monorepo de npm workspaces con **micro-frontends reales
vía Webpack Module Federation** — no una única SPA con "secciones" lógicas. Cada app se
compila, sirve y (en un escenario real) desplegaría por separado; el host las carga en
runtime como `remoteEntry.js` remotos, no como parte de su propio bundle.

```
frontend/
  packages/
    shared/            Tipos + cliente HTTP + estilos, compartidos en TIEMPO DE COMPILACIÓN
      src/
        api/              http-client.ts (puerto HttpClient) + axios-http-client.ts (adaptador)
                           + client.ts (funciones tipadas: getPurchaseRequest, signApproval, ...)
        types.ts          Tipos 1:1 con backend/openapi.yaml
        constants/         Labels/clases de badge por estado (REQUEST_STATUS_LABEL, ...)
        utils/             formatAmount, formatDate
        config/            Validación de API_BASE_URL (zod), sin fallback hardcodeado
        styles/            base.css — design tokens (CSS custom properties) + clases reutilizables
    shell/             HOST de Module Federation — layout + rutas, sin lógica de negocio propia
      src/
        App.tsx            React Router + React.lazy() de cada remote
        components/Layout   Header con nav + footer (link a /correos)
    requester-app/     REMOTE — vistas del Solicitante
      src/pages/          CreateRequestPage, RequestListPage, RequestDetailPage, MockMailPage
    approver-app/      REMOTE — vista del Aprobador
      src/pages/          ApprovalPage (única página: OTP → detalle → firmar/rechazar)
```

**`shared` no es un remote federado**, es una dependencia de workspace normal (su
`package.json` apunta directo a `src/`, sin paso de build): tanto `shell` como los dos
remotes la necesitan en **tiempo de compilación** (tipos, cliente HTTP tipado, CSS), y
cada app igual construye su propio `.env`/`API_BASE_URL`, así que no hay ningún estado
real que valga la pena compartir en runtime entre remotes vía Module Federation —
solo `react`, `react-dom` y `react-router-dom` se declaran `singleton: true` (una sola
instancia entre host y remotes; si no, se rompen `<Link>`/`useNavigate` con "must be used
within a Router" aunque todo compile bien).

### Mapa de rutas (host `shell`)

| Ruta                                           | Página                                                | Remote         |
| ---------------------------------------------- | ----------------------------------------------------- | -------------- |
| `/`                                            | Redirect a `/solicitudes`                             | —              |
| `/solicitudes`                                 | Listado de solicitudes                                | `requesterApp` |
| `/solicitudes/nueva`                           | Crear solicitud                                       | `requesterApp` |
| `/solicitudes/:id`                             | Detalle de solicitud                                  | `requesterApp` |
| `/correos`                                     | Bandeja de mock-mail (solo pruebas, ver abajo)        | `requesterApp` |
| `/approve?solicitud_id=...&approver_token=...` | Flujo de aprobación (OTP → detalle → firmar/rechazar) | `approverApp`  |

`/approve` usa **query params**, no path params (`useSearchParams`, no `useParams`) — a
propósito, porque así viene el link de ejemplo en el enunciado
(`https://dominio.com/approve?solicitud_id=...&approver_token=...`); internamente se
mapea al endpoint real del backend, que sí usa path params (`GET /api/approvals/{id}/{token}`).

### Puertos (dev)

| App                            | Puerto |
| ------------------------------ | ------ |
| `shell` (host)                 | 3001   |
| `requester-app` (remote)       | 3002   |
| `approver-app` (remote)        | 3003   |
| backend (`serverless offline`) | 3000   |

### Flujo funcional en la UI

1. **Solicitante**: crea la solicitud en `/solicitudes/nueva` con un formulario
   `react-hook-form` + `zod` (título, descripción, monto, y exactamente 3 aprobadores
   elegidos de un roster simulado — `MOCK_APPROVERS`, 6 personas con roles distintos, no
   hay endpoint de backend para listar aprobadores). Puede ver el listado
   (`/solicitudes`) y el detalle de cada una (`/solicitudes/:id`: monto, estado, y la
   tabla de las 3 aprobaciones con su estado individual), con un botón manual
   "Actualizar" ya que el estado cambia de forma asíncrona, fuera de esta app.
2. Como no hay envío de correo real, **`/correos`** — enlazada solo desde el pie de
   página, no del nav principal — muestra la bandeja
   simulada del backend (`GET /mock-mail`) y arma, para cada entrada, el link real y
   clickeable hacia `/approve?...` extrayéndolo del texto libre del correo.
3. **Aprobador**: abre su link → `ApprovalPage`, una única página con una máquina de
   estados interna (vía `useState`, sin router anidado): valida que el link tenga
   `solicitud_id` y `approver_token` → carga el resumen mínimo
   (`GET /api/approvals/{id}/{token}`) → si la aprobación sigue `PENDING`, muestra el
   formulario de OTP (6 casillas de un dígito, `react-otp-input`, con auto-avance y
   auto-foco); si ya no está `PENDING` (por ejemplo, el OTP venció y el backend
   auto-rechazó la solicitud antes de que el aprobador llegara a verlo), muestra un
   mensaje de cierre en vez del formulario.
4. Al verificar el OTP (`POST .../verify-otp`), se muestra el detalle completo (monto,
   descripción, las 3 aprobaciones) y, si la aprobación propia y la solicitud siguen
   `PENDING`, los botones **Aprobar**/**Rechazar**. Ninguno de los dos vuelve a pedir el
   código — reutilizan el que ya se verificó — pero el backend igual lo revalida de forma
   independiente en `/sign` y `/reject`.
5. Al completarse la 3ª firma (o si la solicitud ya estaba completa), el link
   "Descargar PDF" aparece automáticamente — mismo patrón reusado en `RequestDetailPage`
   y en `ApprovalPage`.

### Decisiones de arquitectura (frontend)

- **Micro-frontends vía Module Federation.**
  (`shell` no importa código de `requester-app`/`approver-app` en su propio bundle, los
  carga como `remoteEntry.js` externos) en vez de una sola app dividida en carpetas por
  área — así cada micro-frontend es, un deployable independiente.
- **OTP → detalle → firmar/rechazar en una sola página, no rutas separadas.** No hay
  backend de sesión que recuerde "este aprobador ya verificó su OTP", así que el flujo
  completo vive en el estado local de `ApprovalPage`: una vez verificado el código, se
  reutiliza para firmar/rechazar sin volver a pedirlo (el backend igual lo revalida en
  cada acción que compromete). Separarlo en rutas hubiera significado pasar el código en
  la URL o duplicar el paso de verificación sin ganar nada a cambio.
- **`react-otp-input` para el campo de código**, en vez de un `<input>` de texto libre:
  6 casillas de un dígito (una por cada dígito del OTP que genera el backend,
  `randomInt(100000, 1000000)`), con auto-avance entre casillas y auto-foco en la
  primera. El botón "Verificar código" queda deshabilitado hasta completar las 6.
- **Design system centralizado en `shared/src/styles/base.css`**: tokens de diseño como
  CSS custom properties (colores, espaciado, radios, sombras) y clases reutilizables
  (`.btn`, `.card`, `.field`, `.input`, `.badge`, `.table`, etc.) consumidas por las 3
  apps — evita reimplementar los mismos botones/badges/tarjetas tres veces, y mantiene
  una apariencia consistente entre `shell`, `requester-app` y `approver-app` a pesar de
  ser bundles independientes.
- **`.env` por app** (`requester-app` y `approver-app`, cada uno con su propio
  `API_BASE_URL`), inyectado vía `webpack.DefinePlugin` — cada remote es, en los hechos,
  un deployable independiente y podría apuntar a un backend distinto. Sin fallback
  hardcodeado: si `API_BASE_URL` no está seteado, la app falla rápido al iniciar
  (`shared/src/config/env.ts`, validado con `zod`) en vez de apuntar en silencio a una
  URL de producción por accidente.
- **`MockMailPage` (`/correos`) — vista agregada, no pedida en el enunciado**, para poder
  probar el flujo de punta a punta dentro del navegador sin Postman/curl (obtener el
  link+OTP de cada aprobador). Deliberadamente **fuera del nav principal**, solo
  enlazada desde el pie de página con la leyenda "(solo para pruebas)": un Solicitante
  real nunca debería poder ver el OTP/link de un aprobador — eso le permitiría
  autoaprobarse su propia solicitud, rompiendo el sentido de tener aprobadores
  independientes. Si este proyecto necesitara autenticación real, esta vista debería
  quedar fuera del build del Solicitante por completo; por ahora solo está fuera de la
  navegación visible.
- **Hosting: un bucket S3 privado por micro-frontend, pero una sola distribución
  CloudFront (un solo dominio) delante de los 3.** Cada app tiene su propio bucket —
  aislamiento real de recursos por app, útil si en algún momento cada una necesitara
  permisos/pipeline propios — pero comparten un único dominio público: la distribución
  declara 3 orígenes (uno por bucket) y rutea por `PathPattern`
  (`/requester-app/*` → bucket de `requester-app`, `/approver-app/*` → bucket de
  `approver-app`, todo lo demás → bucket de `shell`). Se evita así triplicar
  certificados/dominios/tiempos de propagación de CloudFront por 3 bundles JS estáticos
  que en la práctica no necesitan aislamiento de _origen público_, solo de bucket. Como
  las 3 apps quedan en el mismo dominio, a diferencia de dev no hace falta configurar
  CORS entre ellas para que `shell` cargue los `remoteEntry.js` de los remotes (el
  backend sí restringe CORS por dominio, ver Backend → Decisiones de arquitectura, pero
  eso es tráfico navegador→API, no navegador→CloudFront).
- **`shell` vive en la raíz de su bucket** (no bajo un prefijo): es la única app que de
  verdad se navega directamente en el browser (los remotes solo se cargan
  programáticamente vía Module Federation), así que su bucket es el origen del
  `DefaultCacheBehavior` y su `index.html` es el `DefaultRootObject`. **Los remotes, en
  cambio, hay que subirlos con el mismo prefijo _dentro de su propio bucket_**
  (`s3://<bucket-de-requester-app>/requester-app/remoteEntry.js`, no
  `s3://<bucket-de-requester-app>/remoteEntry.js`) — el `PathPattern` de CloudFront
  reenvía la ruta _tal cual_ al origen (no la reescribe), así que si el objeto no está
  bajo ese mismo prefijo dentro del bucket, el origen devuelve 404. Esto pasó en la
  práctica en el primer deploy real: subir con `aws s3 sync dist s3://<bucket>/` (sin el
  prefijo) hacía que el 404 cayera en el `CustomErrorResponse` de SPA fallback, sirviendo
  el `index.html` de `shell` con status 200 en vez del `remoteEntry.js` — la consola del
  navegador mostraba `SyntaxError: Unexpected token '<'` (JS esperado, HTML recibido) en
  vez de un 404 explícito, lo cual lo hizo más confuso de diagnosticar. `npm run
deploy:site` (ver Despliegue) ya sube al prefijo correcto — evitar `aws s3 sync` suelto
  sin el prefijo es la forma de no repetir este error.
- **Una sola `AWS::CloudFront::OriginAccessControl` (OAC), reusada en los 3 orígenes**
  — no es específica de un bucket, solo define cómo firma CloudFront sus requests a S3,
  así que no hace falta una por bucket. Los 3 buckets quedan completamente privados
  (`PublicAccessBlockConfiguration` bloqueando todo acceso público); cada uno tiene su
  propia bucket policy que solo permite lectura al servicio `cloudfront.amazonaws.com`,
  condicionada a que la request venga de esta distribución específica
  (`Condition: AWS:SourceArn`) — el mecanismo que AWS recomienda actualmente para este
  patrón (Origin Access Identity, el anterior, está en modo legado).
- **Cache deshabilitada (`CachingDisabled`) en vez de invalidación de CloudFront.** Con
  cache activa, cada deploy necesitaría un paso extra de invalidación (`aws cloudfront
create-invalidation`) para que los cambios se vean de inmediato. Para el tráfico de
  esta prueba no vale la pena la complejidad — se prefirió que cada deploy quede visible
  al instante sin ese paso adicional ni el plugin que lo automatizaría.

### Stack

- **React 19** + **React Router 7** (ruteo client-side, tanto en el host como en los remotes).
- **Webpack 5** + **Module Federation** (`shell` como host, `requester-app`/`approver-app` como remotes).
- **TypeScript strict**, **ESLint** (`typescript-eslint`) + **Prettier** — misma configuración que el backend.
- **react-hook-form** + **zod** (formulario de creación de solicitud, con `@hookform/resolvers`).
- **react-otp-input** (campo de código OTP de 6 dígitos).
- **axios** (cliente HTTP, detrás de un puerto `HttpClient` propio).
- **Jest** + **ts-jest** + **@testing-library/react** + **jest-environment-jsdom**, cobertura mínima configurada al 60%.

### Requisitos previos

- Node.js 20+ y npm.
- El backend corriendo — local (`npm run start:serverless` en `backend/`, puerto 3000) o
  el desplegado. En cualquiera de los dos casos el backend solo acepta requests desde los
  orígenes que tiene en su CORS (`localhost:3001/3002/3003` en dev, el dominio real de
  CloudFront en producción — ver Backend → Decisiones de arquitectura); si corrés el
  frontend desde otro puerto/dominio, las llamadas van a fallar por CORS aunque el
  backend esté corriendo bien.

### Cómo correr el frontend

```bash
cd frontend
npm install
```

Configurar a qué backend apunta cada remote (por defecto, el `.env.example` de cada uno
apunta a un valor vacío; copiarlo a `.env` y completar):

```bash
# frontend/packages/requester-app/.env
# frontend/packages/approver-app/.env
API_BASE_URL=http://localhost:3000
```

**Todo junto** (host + los 2 remotes, con recarga en vivo):

```bash
npm run dev
```

Abre `http://localhost:3001` — el `shell` sirve la app completa, cargando en runtime los
remotes desde `:3002` y `:3003`.

**Por separado** (para depurar un remote específico; cada `requester-app`/`approver-app`
también sirve como preview standalone en su propio puerto, con su propio `<BrowserRouter>`):

```bash
npm run start:shell
npm run start:requester-app
npm run start:approver-app
```

**Tests, cobertura, typecheck, lint:**

```bash
npm test              # suite completa (los 4 workspaces)
npm run test:coverage # con reporte de cobertura
npm run typecheck     # tsc --noEmit en cada workspace + serverless.ts
npm run lint          # eslint sobre src/ y tests/ de cada workspace
```

### Despliegue

Igual que el backend, la infraestructura se declara con Serverless Framework
(`frontend/serverless.ts`): 3 buckets S3 privados (uno por app) + una sola distribución
CloudFront con Origin Access Control delante, ruteando por prefijo a cada bucket (ver
"Decisiones de arquitectura" más arriba). A diferencia del backend, este stack no tiene
funciones Lambda — solo `resources` (buckets, distribución, Origin Access Control, bucket
policies) — y la subida de los archivos estáticos se hace aparte, con `aws s3 sync`, no
con un plugin.

**1. Crear/actualizar la infraestructura** (3 buckets + CloudFront):

```bash
cd frontend
npx serverless deploy
```

La primera vez tarda varios minutos (CloudFront demora en propagarse). Al terminar,
`Outputs` incluye `CloudFrontDomain` (el dominio público, un solo dominio para las 3
apps) y `ShellBucketName`/`RequesterAppBucketName`/`ApproverAppBucketName` (con el
formato `${sls:stage}-<app>-${aws:accountId}`, ej. `dev-requester-app-123456789012` — sin
el prefijo del nombre del servicio, ver "Decisiones de arquitectura"). Si no quedaron a
la vista, se recuperan después con:

```bash
npx serverless info --verbose
```

**2. Apuntar `shell` al dominio real de CloudFront**, en vez del `localhost` de dev
(`packages/shell/.env`, ver `.env.example`):

```bash
# frontend/packages/shell/.env
REQUESTER_APP_REMOTE=https://<CloudFrontDomain>/requester-app/remoteEntry.js
APPROVER_APP_REMOTE=https://<CloudFrontDomain>/approver-app/remoteEntry.js
```

Y confirmar que `packages/requester-app/.env` y `packages/approver-app/.env` apuntan al
backend real (`API_BASE_URL`). El backend, a su vez, tiene que tener este mismo dominio
de CloudFront en `FRONTEND_BASE_URL` (ver Backend → Despliegue) — si no coincide, el
navegador bloquea las llamadas por CORS.

**3. Compilar las 3 apps:**

```bash
npm run build
```

**4. Sincronizar cada `dist/` a su propio bucket** (`shell` va en la raíz de su bucket;
los remotes van con su propio prefijo, pero **dentro de su propio bucket** — ver
"Decisiones de arquitectura"):

```bash
npm run deploy:site
```

Es un atajo (`frontend/scripts/deploy-site.js`, invocado desde `package.json`) que resuelve
los 3 nombres de bucket consultando los outputs del stack ya desplegado
(`aws cloudformation describe-stacks`) y encadena los 3 `aws s3 sync` — uno por app, cada
uno a su propio bucket. No tiene ningún valor hardcodeado (ni buckets ni cuenta de AWS),
así que funciona igual sin importar en qué cuenta se haya desplegado el stack. Los
comandos equivalentes, para correr sueltos si hace falta:

```bash
aws s3 sync packages/shell/dist s3://<ShellBucketName>/ --delete
aws s3 sync packages/requester-app/dist s3://<RequesterAppBucketName>/requester-app/ --delete
aws s3 sync packages/approver-app/dist s3://<ApproverAppBucketName>/approver-app/ --delete
```

Como el `DefaultCacheBehavior` de CloudFront tiene la cache deshabilitada, no hace falta
invalidar nada — el sitio queda actualizado apenas termina el `s3 sync`. La app completa
queda disponible en `https://<CloudFrontDomain>/`.

Los pasos 3 y 4 son los únicos que hay que repetir en cada deploy posterior (la
infraestructura del paso 1 ya existe); el paso 2 solo hace falta la primera vez, o si
cambia el dominio de CloudFront.

### URL desplegada

```
https://d2ftd7hooofr27.cloudfront.net
```

(Stage `dev`, región `us-east-1`. El backend detrás, en `FRONTEND_BASE_URL` y en el CORS
del backend, apunta a este mismo dominio.)
