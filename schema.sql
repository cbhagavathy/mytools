-- Schema for MyTools application

-- Table to store tool usage history (optional, for future use)
CREATE TABLE IF NOT EXISTS tool_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_ip TEXT
);

-- Table to store saved conversions (optional, for future use)
CREATE TABLE IF NOT EXISTS saved_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL,
    input_content TEXT,
    output_content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

