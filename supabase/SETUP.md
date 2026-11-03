# Supabase sensor readings

The dashboard uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
`PersonalSensorDashboard/.env` to load, subscribe to, and insert readings.
There is no ingest token or Edge Function.

For GitHub Pages deployments, add repository Actions secrets under
**Settings → Secrets and variables → Actions**. Use `SUPABASE_URL` and
`SUPABASE_ANON_KEY`, or name them `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. The deployment workflow accepts either naming
convention and supplies them as Vite build variables.
Enable GitHub Pages for the repository with **Settings → Pages → Source:
GitHub Actions**. Deployments run on pushes to `main` and can also be started
manually from the Actions tab.

Run [`schema.sql`](./schema.sql) in the Supabase SQL Editor to create the
`public.sensor_readings` table and enable dashboard reads and inserts. Then
refresh the dashboard, click **Connect Arduino**, and choose the serial port.
The Arduino should send one sensor value per line at 9600 baud, for example
`Serial.println(analogRead(A0));`. An optional LED state is accepted in the
form `SENSOR: 950, LED: ON`.

The anon key is public by design and is visible in the browser. The insert
policy permits anyone with access to the project URL and anon key to submit
sensor readings, so use this setup only if public inserts are acceptable.
