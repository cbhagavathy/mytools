# Quick Command Reference

## Application Management

### Start the Application
```bash
./manage.sh start
```
Starts the application in background mode. You can close the terminal and the app will continue running.

### Stop the Application
```bash
./manage.sh stop
```
Gracefully stops the running application.

### Restart the Application
```bash
./manage.sh restart
```
Stops and starts the application (useful after code changes).

### Check Status
```bash
./manage.sh status
```
Shows:
- Running/Stopped status
- Process ID (PID)
- CPU and memory usage
- Uptime
- Access URL

### View Logs
```bash
./manage.sh logs
```
Shows live logs (press Ctrl+C to exit).

### View Last 50 Lines of Logs
```bash
tail -50 mytools.log
```

---

## Alternative: Quick Start (Foreground Mode)

If you want to run the app in the foreground (see output directly):

```bash
./start.sh
```

Press Ctrl+C to stop.

---

## Manual Commands

### Activate Virtual Environment
```bash
source venv/bin/activate
```

### Deactivate Virtual Environment
```bash
deactivate
```

### Install/Update Dependencies
```bash
pip install -r requirements.txt
```

### Run in Development Mode
```bash
python app.py
```

---

## Troubleshooting

### Port Already in Use
If port 4000 is already in use, you'll see an error. Find and kill the process:

```bash
# Find process using port 4000
lsof -ti:4000

# Kill the process
kill -9 $(lsof -ti:4000)

# Or use manage script
./manage.sh stop
```

### Check if Application is Running
```bash
./manage.sh status
```

### View Error Logs
```bash
cat mytools.log
```

### Clean Start (Remove PID file if stuck)
```bash
rm -f mytools.pid
./manage.sh start
```

---

## Quick Access

- **Home Page**: http://localhost:4000
- **Markdown Converter**: http://localhost:4000/tools/markdown-converter

---

## File Locations

- **Application**: `app.py`
- **PID File**: `mytools.pid` (auto-created)
- **Log File**: `mytools.log` (auto-created)
- **Database**: `instance/mytools.db` (auto-created)

