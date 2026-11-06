# Laboratorio de pruebas de carga con Apache JMeter

Dos sitios web locales con tema oscuro estilo Microsoft Teams, pensados como objetivo de pruebas de carga:

| Sitio | URL | Descripción |
|-------|-----|-------------|
| `light` | http://localhost:8081 | Ligero: HTML pequeño y respuestas JSON mínimas |
| `heavy` | http://localhost:8082 | Pesado: ~285 KB de HTML con 600 tarjetas, script de ~500 KB, JSON grande (1500 mensajes) y endpoints con trabajo de CPU (`pbkdf2`) |

Ambos exponen `/` (página), `/login` (formulario), `POST /api/login`, `/api/messages` y `/health`. Cada contenedor está limitado a 0.5 CPU y 256 MB para que la saturación sea visible.

Credenciales válidas: `user01` … `user50`, contraseña `Passw0rd!` (ver `data/users.csv`).

## Requisitos

Solo Docker con Docker Compose. JMeter corre dentro de un contenedor (no necesitas instalarlo). Todo es gratuito y local.

## Levantar los sitios

```bash
docker compose up -d --build
```

Para detenerlos: `docker compose down`.

## Ejecutar pruebas (modo CLI + reporte HTML)

```bash
./scripts/run-test.sh baseline   # 10 usuarios
./scripts/run-test.sh normal     # 100 usuarios
./scripts/run-test.sh stress     # 500 usuarios
```

El script levanta los sitios si hace falta, ejecuta JMeter sin interfaz gráfica y genera:

- `results/<escenario>/results.jtl`: resultados crudos
- `results/<escenario>/report/index.html`: reporte HTML (ábrelo en el navegador)

Comando equivalente sin el script:

```bash
docker compose --profile test run --rm jmeter -n -t /work/jmeter/load-test.jmx \
  -q /work/jmeter/scenarios/baseline.properties \
  -l /work/results/baseline/results.jtl -e -o /work/results/baseline/report
```

### Escenarios

| Escenario | Usuarios | Ramp-up | Duración |
|-----------|----------|---------|----------|
| baseline | 10 | 10 s | 60 s |
| normal | 100 | 60 s | 180 s |
| stress | 500 | 120 s | 300 s |

Cada Thread Group (uno por sitio) usa estos valores. Puedes sobreescribir cualquier parámetro al ejecutar, por ejemplo:

```bash
./scripts/run-test.sh baseline -Jusers=25 -Jduration=120 -Jthink_min=200 -Jthink_range=500
```

Parámetros disponibles: `users`, `rampup`, `duration`, `think_min`, `think_range` (timer aleatorio uniforme, ms), `light_host`, `light_port`, `heavy_host`, `heavy_port`, `users_file`.

En `stress` el sitio pesado probablemente mostrará errores y timeouts: es lo esperado. Para estresar más, sube `-Jusers`.

## Contenido del plan `jmeter/load-test.jmx`

- Thread Group "Light Site Users": home, login (datos de `data/users.csv`) y API de mensajes.
- Thread Group "Heavy Site Users": home, script pesado, login, API grande y API de CPU.
- Aserciones de código HTTP (200) y de contenido esperado en cada petición.
- Uniform Random Timer entre peticiones (tiempo de espera de usuario).
- Listeners: Aggregate Report, Summary Report y Results Tree (solo errores); en CLI se usa el `.jtl` y el reporte HTML.

## Cómo interpretar el reporte

Abre `results/<escenario>/report/index.html` y revisa la tabla *Statistics* (una fila por petición):

- **Tiempo promedio (Average)**: media de la respuesta. Útil como referencia, pero oculta valores extremos.
- **Percentil 95 (95th pct)**: el 95 % de las peticiones respondió en este tiempo o menos. Es la mejor métrica de la experiencia real; si se aleja mucho del promedio hay picos de latencia.
- **Throughput**: peticiones por segundo atendidas. Debe crecer con los usuarios; si se estanca o cae mientras suben los usuarios, el servidor llegó a su límite.
- **% de errores (Error %)**: peticiones fallidas (código distinto de 200, timeout o aserción fallida). Lo ideal es 0 %; más de 1–2 % indica problemas.

Compara `light` contra `heavy` en cada escenario: normalmente el pesado muestra mayor promedio y p95, menor throughput y errores antes que el ligero. En *Over Time* → *Response Times Over Time* y *Active Threads Over Time* puedes ver en qué número de usuarios empieza la degradación.
