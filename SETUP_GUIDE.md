# Gaelic Gym Booker - Setup Guide

This guide will help you set up and run the Gaelic Gym Booking application on your computer at `http://localhost:5000`.

---

## What You'll Need

Before starting, you'll need to install the following software on your computer:

1. **Python** (version 3.11 or higher)
   - Download from: https://www.python.org/downloads/
   - During installation, **make sure to check the box that says "Add Python to PATH"**

2. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Choose the "LTS" (Long Term Support) version

3. **A Command Prompt or Terminal**
   - On Windows: Use Command Prompt or PowerShell (search for "cmd" or "PowerShell" in Start menu)

---

## Step 1: Download and Extract the Application

1. If you haven't already, download the application files
2. Extract the ZIP file to a location you can easily find (e.g., `Downloads` folder)
3. You should see a folder structure like:
   ```
   Gaelic-Gym-Booker/
   └── Gaelic-Gym-Booker/
       ├── backend/
       ├── frontend/
       ├── main.py
       └── pyproject.toml
   ```

---

## Step 2: Open Command Prompt in the Right Folder

1. Open File Explorer and navigate to:
   ```
   C:\Users\ConorBrolly\Downloads\Gaelic-Gym-Booker\Gaelic-Gym-Booker
   ```

2. In the address bar at the top, click once and type `cmd`, then press Enter
   - This opens Command Prompt directly in the correct folder

3. You should see something like:
   ```
   C:\Users\ConorBrolly\Downloads\Gaelic-Gym-Booker\Gaelic-Gym-Booker>
   ```

---

## Step 3: Set Up the Backend (Python/FastAPI)

The backend handles all the data and business logic for the gym booking system.

### Install Python Dependencies

In the Command Prompt window, type the following command and press Enter:

```bash
pip install -e .
```

This will install all the required Python packages (FastAPI, database tools, etc.).

**Wait for this to complete** - it might take 1-2 minutes.

### Verify Backend Installation

To check if everything is installed correctly, run:

```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
Initializing database...
Database initialized!
```

**Great!** The backend is running. Now press `Ctrl+C` to stop it (we'll start both servers together later).

---

## Step 4: Set Up the Frontend (Next.js)

The frontend is the web interface users will interact with.

### Navigate to the Frontend Folder

In the same Command Prompt window, type:

```bash
cd frontend
```

### Install Node Dependencies

Now install the frontend packages:

```bash
npm install
```

This will install React, Next.js, Tailwind CSS, and other frontend tools.

**Wait for this to complete** - it might take 2-3 minutes.

---

## Step 5: Configure the Frontend

The frontend needs to know where the backend server is located.

### Create a Configuration File

1. In the `frontend` folder, create a new file called `.env.local`
2. Open it with Notepad and add this line:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
3. Save and close the file

**Alternative (Command Line):**
```bash
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
```

---

## Step 6: Run the Application

Now you'll start both the backend and frontend servers.

### Start the Backend

1. Open a **new** Command Prompt window in the main project folder:
   ```
   C:\Users\ConorBrolly\Downloads\Gaelic-Gym-Booker\Gaelic-Gym-Booker
   ```

2. Start the backend server:
   ```bash
   python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Keep this window open** - the backend is now running on port 8000

### Start the Frontend

1. Open **another new** Command Prompt window
2. Navigate to the frontend folder:
   ```bash
   cd C:\Users\ConorBrolly\Downloads\Gaelic-Gym-Booker\Gaelic-Gym-Booker\frontend
   ```

3. Start the frontend server:
   ```bash
   npm run dev
   ```

4. You should see:
   ```
   ✓ Starting...
   ✓ Ready in 2.3s
   - Local:        http://localhost:5000
   - Network:      http://0.0.0.0:5000
   ```

5. **Keep this window open** - the frontend is now running on port 5000

---

## Step 7: Access the Application

1. Open your web browser (Chrome, Firefox, Edge, etc.)
2. Go to: **http://localhost:5000**
3. You should see the Gaelic Gym Booking application homepage!

---

## Testing the Application

### Create a Test Account

1. Click on "Register" or "Sign Up"
2. Fill in:
   - Name: Your name
   - Email: Any email (e.g., test@example.com)
   - Password: Choose a password
   - Date of Birth: Your birth date
3. Click "Register"

### Wait for Admin Approval

By default, new accounts need admin approval. You can:

**Option A: Create an Admin Account (Recommended)**

1. Stop the backend server (press `Ctrl+C` in that window)
2. Run the test user creation script:
   ```bash
   python backend/create_test_users.py
   ```
3. Restart the backend:
   ```bash
   python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
4. You can now log in with:
   - Email: `admin@gaelicgym.com`
   - Password: `Admin123!`
   - Role: Admin (can approve members and manage bookings)

**Option B: Manually Approve in Database**

If you're comfortable with SQLite databases, you can manually set `is_approved=1` in the `members` table.

---

## Common Issues and Solutions

### Issue: "pip is not recognized"
**Solution:** Python wasn't added to PATH during installation. Reinstall Python and check "Add Python to PATH".

### Issue: "npm is not recognized"
**Solution:** Node.js wasn't added to PATH. Reinstall Node.js or restart your computer.

### Issue: "Port 5000 is already in use"
**Solution:** Another application is using port 5000. Either:
- Close that application
- Or change the port in `frontend/package.json` (line 6 and 8) to another number like 3000

### Issue: "Port 8000 is already in use"
**Solution:** Another application is using port 8000. Change it in the backend command:
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8001 --reload
```
And update `frontend/.env.local` to:
```
NEXT_PUBLIC_API_URL=http://localhost:8001
```

### Issue: Can't connect to backend
**Solution:**
- Make sure both servers are running (you should have two Command Prompt windows open)
- Check that `frontend/.env.local` has the correct backend URL
- Restart the frontend server after changing `.env.local`

### Issue: Database errors
**Solution:**
- Delete the `backend/gym_booking.db` file
- Restart the backend server - it will create a fresh database

---

## Stopping the Application

To stop the application:

1. Go to each Command Prompt window (backend and frontend)
2. Press `Ctrl+C` in each window
3. Type `Y` if asked "Terminate batch job?"
4. Close the Command Prompt windows

---

## Quick Start Script (For Future Use)

Once everything is set up, you can create two batch files to make starting easier:

### start-backend.bat
Create a file called `start-backend.bat` in the main folder with:
```batch
@echo off
cd /d "%~dp0"
echo Starting Backend Server...
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
pause
```

### start-frontend.bat
Create a file called `start-frontend.bat` in the main folder with:
```batch
@echo off
cd /d "%~dp0frontend"
echo Starting Frontend Server...
npm run dev
pause
```

Then just double-click these files to start each server!

---

## Application Features

Once logged in and approved, you can:

- **View Available Time Slots**: See gym availability by day
- **Book Sessions**: Reserve time slots for gym use
- **Manage Bookings**: View and cancel your bookings
- **Admin Functions** (admin users only):
  - Approve/reject new member registrations
  - View all bookings
  - View system statistics
  - Manage members

---

## API Documentation

The backend provides interactive API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

You can use these to test API endpoints directly!

---

## Need Help?

If you encounter issues:

1. Make sure both backend and frontend servers are running
2. Check the Command Prompt windows for error messages
3. Try restarting both servers
4. Delete the database file and let it recreate
5. Make sure you're using the correct URLs (localhost:5000 for frontend, localhost:8000 for backend)

---

## Technical Details (For Developers)

### Backend Stack
- **Framework**: FastAPI (Python)
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: JWT tokens with HTTP-only cookies
- **Port**: 8000

### Frontend Stack
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS 4
- **HTTP Client**: Axios
- **Port**: 5000

### Project Structure
```
Gaelic-Gym-Booker/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── database.py      # Database configuration
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routers/         # API endpoints
│   │   └── utils/           # Helper functions
│   ├── alembic/             # Database migrations
│   └── tests/               # Backend tests
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities
│   └── public/              # Static assets
└── pyproject.toml           # Python dependencies
```
