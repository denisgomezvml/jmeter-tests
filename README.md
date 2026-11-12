# JMeter Load Testing Lab

A practice project for load testing with Apache JMeter. It runs two local web sites, one light and one heavy, so you can compare how each behaves under load. Everything runs locally with Docker Compose and free tools only.

## Project structure

```
.
├── docker-compose.yml          Sites and the JMeter runner
├── data/users.csv              Test credentials used by the login requests
├── jmeter/
│   ├── Dockerfile              JMeter image used in non-GUI mode
│   ├── load-test.jmx           Test plan
│   └── scenarios/              baseline, normal and stress properties
├── scripts/run-test.sh         Runs a scenario and builds the HTML report
├── sites/
│   ├── light/                  Lightweight site
│   ├── heavy/                  Heavy site
│   └── shared/                 Shared theme, login script and server code
└── results/                    Generated output (ignored by git)
```

## Target sites

| Site  | URL                   | Description |
|-------|-----------------------|-------------|
| light | http://localhost:8081 | Small HTML page and minimal JSON responses |
| heavy | http://localhost:8082 | About 285 KB of HTML with 600 cards, a script of about 500 KB, a large JSON payload (1500 messages) and CPU-bound endpoints (`pbkdf2`) |

Both sites expose `/`, `/login`, `POST /api/login`, `/api/messages` and `/health`. Each container is limited to 0.5 CPU and 256 MB of memory so saturation shows up clearly.

Valid credentials are `user01` to `user50` with password `Passw0rd!` (see `data/users.csv`).

## Requirements

Docker with Docker Compose. JMeter runs inside a container, so no local installation is needed.

## Start the sites

```bash
docker compose up -d --build
```

Stop them with:

```bash
docker compose down
```

## Run a load test

```bash
./scripts/run-test.sh baseline
./scripts/run-test.sh normal
./scripts/run-test.sh stress
```

The script starts the sites if needed, runs JMeter in non-GUI mode and writes:

- `results/<scenario>/results.jtl` with the raw results
- `results/<scenario>/report/index.html` with the HTML report

Equivalent command without the script:

```bash
docker compose --profile test run --rm jmeter -n -t /work/jmeter/load-test.jmx \
  -q /work/jmeter/scenarios/baseline.properties \
  -l /work/results/baseline/results.jtl -e -o /work/results/baseline/report
```

### Scenarios

| Scenario | Users | Ramp-up | Duration |
|----------|-------|---------|----------|
| baseline | 10    | 10 s    | 60 s     |
| normal   | 100   | 60 s    | 180 s    |
| stress   | 500   | 120 s   | 300 s    |

Each Thread Group (one per site) uses these values. Any property can be overridden on the command line:

```bash
./scripts/run-test.sh baseline -Jusers=25 -Jduration=120 -Jthink_min=200 -Jthink_range=500
```

Available properties: `users`, `rampup`, `duration`, `think_min`, `think_range` (uniform random timer, in ms), `light_host`, `light_port`, `heavy_host`, `heavy_port` and `users_file`.

Under the stress scenario the heavy site is expected to show errors and timeouts. Increase `-Jusers` to push further.

## Test plan

`jmeter/load-test.jmx` contains:

- A "Light Site Users" Thread Group: home page, login with data from `data/users.csv`, and the messages API.
- A "Heavy Site Users" Thread Group: home page, heavy script, login, large messages API and CPU-bound API.
- Response assertions on the HTTP status code (200) and on expected content for every request.
- A Uniform Random Timer between requests to simulate user think time.
- Listeners: Aggregate Report, Summary Report and a Results Tree limited to errors. In CLI mode the `.jtl` file and HTML report are used.

## Reading the report

Open `results/<scenario>/report/index.html` and check the Statistics table, which has one row per request:

- **Average**: mean response time. A useful baseline, but it hides extreme values.
- **95th percentile**: 95 percent of requests responded in this time or less. It is a better indicator of real user experience; a large gap from the average points to latency spikes.
- **Throughput**: requests served per second. It should grow with the number of users. If it flattens or drops while users keep increasing, the server has reached its limit.
- **Error %**: share of failed requests (non-200 status, timeout or failed assertion). Ideally 0 percent; more than 1 to 2 percent indicates a problem.

Compare the light and heavy sites in each scenario. The heavy site typically shows a higher average and 95th percentile, lower throughput and errors earlier than the light one. The Response Times Over Time and Active Threads Over Time charts show at what user count degradation begins.
