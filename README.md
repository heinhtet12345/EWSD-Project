# EWSD Project

University idea management system built with:

- `Django` + `Django REST Framework` for the backend
- `React` + `Vite` + `TypeScript` for the frontend
- `PostgreSQL` for the database

This project includes a populated PostgreSQL dump so the system can be restored with sample data for demonstration and marking.

## Project Structure

```text
backend/    Django backend
frontend/   React frontend
batch/      Windows helper scripts
backend/sql/ewsd_project_db.dump   Database dump
```

## Requirements

Make sure these are installed first:

- `Python 3.12+`
- `Node.js 18+`
- `PostgreSQL`
- `npm`

Recommended on Windows:

- PostgreSQL command-line tools available in `PATH`
  Required tools:
  - `createdb`
  - `pg_restore`

## Database Setup

This project includes a prepared database dump:

```text
backend/sql/ewsd_project_db.dump
```

### Option 1: Restore using the batch script

Run:

```bat
batch\restore-db.bat
```

What it does:

- checks whether PostgreSQL tools are installed
- checks common PostgreSQL install folders
- uses the included dump file
- creates database `ewsd_project_db`
- restores the dump into that database

You can also pass custom values:

```bat
batch\restore-db.bat "D:\path\to\dumpfile.dump" my_db_name postgres
```

### Option 2: Restore manually (Windows)

```powershell
createdb ewsd_project_db
pg_restore -U postgres -d ewsd_project_db --clean --if-exists --no-owner --no-privileges backend/sql/ewsd_project_db.dump
```

### Option 3: Restore manually (macOS / Linux)

On macOS, PostgreSQL uses your system username by default instead of `postgres`. Run `whoami` if you are unsure of your username.

```bash
createdb ewsd_project_db
pg_restore -U YOUR_USERNAME -d ewsd_project_db --clean --if-exists --no-owner --no-privileges backend/sql/ewsd_project_db.dump
```

> If you get a `role "postgres" does not exist` error, update `DB_user` in your `.env` to match your system username.

## Environment Setup

Create a root `.env` file in the project folder.

Use the following values as a guide:

```env
DB_name=ewsd_project_db
DB_user=postgres
DB_password=your_postgres_password
DB_host=localhost
DB_port=5432

VITE_USE_MOCK_API=false

ENABLE_RECAPTCHA=false
VITE_ENABLE_RECAPTCHA=false
RECAPTCHA_SECRET_KEY=
VITE_RECAPTCHA_SITE_KEY=
```

Notes:

- `DB_*` must match your PostgreSQL database settings
- `VITE_USE_MOCK_API` should stay `false` for normal use
- reCAPTCHA is optional
- if reCAPTCHA is enabled, both backend and frontend keys must be provided

## Backend Setup

Open a terminal in `backend/` and run:

**Windows:**

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**macOS / Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The backend runs at:

```text
http://localhost:8000
```

## Frontend Setup

Open another terminal in `frontend/` and run:

```bash
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

## Quick Start Using Batch Scripts

Available helper scripts in `batch/`:

- `restore-db.bat` restores the PostgreSQL dump
- `start-all.bat` starts frontend and backend
- `stop-all.bat` stops started services
- `start-redis.bat` starts Redis if needed
- `stop-redis.bat` stops Redis
- `check-redis.bat` checks Redis status

Suggested order:

1. Restore database

```bat
batch\restore-db.bat
```

2. Start the project

```bat
batch\start-all.bat
```

## Login / Demo Data

The restored dump contains pre-populated data for demonstration, including:

- users
- departments
- roles
- categories
- closure periods
- ideas
- comments
- votes
- reports
- analytics logs

Use the accounts contained in the restored dump for testing.

If needed, sample users or additional demo data can also be generated through management commands in `backend/api/management/commands/`.

## Notes for Instructor / Marker

To run the system successfully:

1. Install PostgreSQL, Python, and Node.js
2. Restore the included database dump
3. Set the correct DB credentials in `.env`
4. Start backend and frontend

If PostgreSQL tools are not detected automatically, add PostgreSQL's `bin` folder to your system `PATH`.

## Troubleshooting

### PostgreSQL tools not found

Install PostgreSQL and make sure these commands work:

```powershell
createdb --version
pg_restore --version
```

### Frontend opens but shows nothing

Check:

- backend is running on `localhost:8000`
- `.env` has `VITE_USE_MOCK_API=false`
- frontend dev server was restarted after changing `.env`

### reCAPTCHA errors

If you are not using reCAPTCHA, keep:

```env
ENABLE_RECAPTCHA=false
VITE_ENABLE_RECAPTCHA=false
```

If you enable it, provide valid Google keys in `.env`.

## Developers

Diploma Group Project  
EWSD Project Team

## License

Academic use only. Not licensed for commercial distribution.
