#!/bin/bash

# MyTools Management Script
# Usage: ./manage.sh {start|stop|restart|status}

APP_NAME="MyTools"
PID_FILE="mytools.pid"
LOG_FILE="mytools.log"
PORT=4000

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if app is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to start the application
start_app() {
    if is_running; then
        echo -e "${YELLOW}⚠️  $APP_NAME is already running (PID: $(cat $PID_FILE))${NC}"
        echo -e "${BLUE}📍 Access at: http://localhost:$PORT${NC}"
        return 1
    fi

    echo -e "${BLUE}🛠️  Starting $APP_NAME...${NC}"
    echo ""

    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
        python3 -m venv venv
    fi

    # Activate virtual environment
    source venv/bin/activate

    # Install dependencies
    echo -e "${YELLOW}📥 Checking dependencies...${NC}"
    pip install -q -r requirements.txt

    # Start the application in background
    echo -e "${GREEN}🚀 Starting Flask application...${NC}"
    nohup python app.py > "$LOG_FILE" 2>&1 &
    
    # Save PID
    echo $! > "$PID_FILE"
    
    # Wait a moment for the app to start
    sleep 2
    
    if is_running; then
        echo -e "${GREEN}✅ $APP_NAME started successfully!${NC}"
        echo -e "${BLUE}📍 Access at: http://localhost:$PORT${NC}"
        echo -e "${BLUE}📋 PID: $(cat $PID_FILE)${NC}"
        echo -e "${BLUE}📄 Logs: $LOG_FILE${NC}"
    else
        echo -e "${RED}❌ Failed to start $APP_NAME${NC}"
        echo -e "${YELLOW}Check logs: tail -f $LOG_FILE${NC}"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Function to stop the application
stop_app() {
    if ! is_running; then
        echo -e "${YELLOW}⚠️  $APP_NAME is not running${NC}"
        return 1
    fi

    PID=$(cat "$PID_FILE")
    echo -e "${YELLOW}⏹️  Stopping $APP_NAME (PID: $PID)...${NC}"
    
    kill $PID
    
    # Wait for process to stop
    for i in {1..10}; do
        if ! ps -p $PID > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # Force kill if still running
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Force stopping...${NC}"
        kill -9 $PID
    fi
    
    rm -f "$PID_FILE"
    echo -e "${GREEN}✅ $APP_NAME stopped${NC}"
}

# Function to restart the application
restart_app() {
    echo -e "${BLUE}🔄 Restarting $APP_NAME...${NC}"
    stop_app
    sleep 2
    start_app
}

# Function to show status
show_status() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🛠️  $APP_NAME Status${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}Status: Running ✅${NC}"
        echo -e "${BLUE}PID: $PID${NC}"
        echo -e "${BLUE}URL: http://localhost:$PORT${NC}"
        echo -e "${BLUE}Log File: $LOG_FILE${NC}"
        echo ""
        echo -e "${BLUE}Process Info:${NC}"
        ps -p $PID -o pid,ppid,%cpu,%mem,etime,command | tail -n +2
    else
        echo -e "${RED}Status: Stopped ❌${NC}"
    fi
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo -e "${BLUE}📄 Showing last 50 lines of logs (Ctrl+C to exit):${NC}"
        echo ""
        tail -n 50 -f "$LOG_FILE"
    else
        echo -e "${YELLOW}⚠️  Log file not found${NC}"
    fi
}

# Main script logic
case "$1" in
    start)
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo -e "${BLUE}🛠️  MyTools Management Script${NC}"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start     - Start the application"
        echo "  stop      - Stop the application"
        echo "  restart   - Restart the application"
        echo "  status    - Show application status"
        echo "  logs      - Show application logs (live tail)"
        echo ""
        exit 1
        ;;
esac

exit 0

