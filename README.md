# MyTools - Web Utilities Collection

A collection of handy web-based tools built with Python Flask, SQLite3, and Bootstrap 5.

## Features

### Current Tools

1. **Markdown to HTML Converter**
   - Convert Markdown text to formatted HTML
   - Live preview of rendered content
   - Copy HTML source code
   - Copy rendered formatted content for pasting into documents
   - Supports all standard Markdown features including:
     - Headers, bold, italic, links
     - Lists (ordered and unordered)
     - Code blocks with syntax highlighting
     - Tables
     - Blockquotes
     - And more!

2. **XML Formatter**
   - Format and beautify XML content
   - Validate XML syntax
   - **Interactive Tree View** - Visualize XML structure hierarchically with collapsible nodes
   - Minify XML (remove unnecessary whitespace)
   - Configurable indentation (2, 4, or 8 spaces)
   - Two view modes: Text and Tree
   - Color-coded tree elements, attributes, and text content
   - Copy formatted output
   - Statistics: line count, character count, file size, element count
   - Real-time formatting with error detection

3. **EPOCH / Unix Timestamp Converter**
   - Convert EPOCH timestamp to human-readable date/time
   - Convert date/time to EPOCH timestamp (bidirectional)
   - Supports both seconds and milliseconds
   - Display in both UTC and local timezone
   - Real-time current timestamp display
   - Multiple date format support
   - Date/time picker for easy input
   - Copy individual values with one click

4. **File / Text Comparison Tool**
   - Compare two text files or content blocks
   - Side-by-side diff view with color-coded changes
   - Unified diff view (Git-style)
   - Detailed statistics (similarity %, added, deleted, modified lines)
   - Line-by-line comparison
   - Swap and clear functions
   - Copy diff results
   - Real-time line counting

5. **SQL Query Formatter**
   - Format and beautify SQL queries
   - Oracle SQL optimized (supports Oracle-specific keywords)
   - Keyword case options (UPPERCASE, lowercase, Title Case)
   - Customizable indentation (2/4 spaces or Tab)
   - Minify SQL queries
   - Syntax highlighting with line numbers
   - Query statistics (lines, characters, keywords, tables)
   - Copy formatted queries

### Coming Soon
- Additional web utilities will be added to this platform

## Tech Stack

- **Backend**: Python 3.x + Flask
- **Database**: SQLite3
- **Frontend**: Bootstrap 5.3.2
- **Additional Libraries**: 
  - Markdown (for conversion)
  - Pygments (for code syntax highlighting)

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Setup Instructions

1. **Clone or download this repository**

2. **Navigate to the project directory**
   ```bash
   cd mytools
   ```

3. **Run the application**
   
   **Using the management script (Recommended):**
   ```bash
   ./manage.sh start
   ```
   
   **Or using the quick start script:**
   ```bash
   ./start.sh
   ```
   
   **Or manually:**
   ```bash
   # Create virtual environment
   python3 -m venv venv
   
   # Activate virtual environment
   source venv/bin/activate  # On macOS/Linux
   # or
   venv\Scripts\activate     # On Windows
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Run the application
   python app.py
   ```

4. **Open your browser**
   - Navigate to: `http://localhost:4000`

## Management Commands

The `manage.sh` script provides easy management of the application:

```bash
# Start the application (runs in background)
./manage.sh start

# Stop the application
./manage.sh stop

# Restart the application
./manage.sh restart

# Check application status
./manage.sh status

# View application logs (live tail)
./manage.sh logs
```

### Script Features:
- ✅ Background process management
- ✅ PID tracking
- ✅ Automatic dependency installation
- ✅ Log file management
- ✅ Status monitoring
- ✅ Color-coded output

## Usage

### String Processor

1. Navigate to the **String Processor** tool from the home page
2. Enter or paste your text in the input area
3. View real-time statistics:
   - Characters, letters, numbers, spaces, special characters
   - Word count, line count, unique characters
4. Click any transformation card to apply it:
   - **Case Conversions**: UPPERCASE, lowercase, Title Case, camelCase, snake_case, etc.
   - **Text Manipulations**: Reverse, trim, remove spaces, sort lines, etc.
   - **Encoding/Decoding**: Base64, URL encoding
5. View the transformed output in the right panel
6. Click **Copy Output** to copy the result to clipboard

### SQL Formatter

1. Navigate to the **SQL Formatter** tool from the home page
2. Paste your SQL query in the input area
3. Configure formatting options:
   - **Keyword Case**: UPPERCASE, lowercase, or Title Case
   - **Indentation**: 2 spaces, 4 spaces, or Tab
   - **Line Break**: Break before comma (checkbox)
4. Click **Format** (or press Ctrl+Enter / Cmd+Enter) to beautify
5. Or click **Minify** to compress the query
6. View syntax-highlighted output with line numbers
7. Click **Copy Formatted SQL** to copy the result
8. View statistics:
   - Line count
   - Character count
   - SQL keyword count
   - Tables detected

**Oracle SQL Keywords Supported:**
- Standard SQL: SELECT, FROM, WHERE, JOIN, etc.
- Oracle-specific: VARCHAR2, NUMBER, CLOB, BLOB, ROWNUM, DUAL, CONNECT BY, etc.

### Markdown Converter

1. Navigate to the **Markdown Converter** tool from the home page
2. Enter your Markdown text in the left textbox
3. Click the **Convert** button (or press Ctrl+Enter / Cmd+Enter)
4. View the rendered preview on the right side
5. Use the copy buttons:
   - **Copy HTML**: Copies the raw HTML source code
   - **Copy Rendered**: Copies the formatted content for pasting into documents

### XML Formatter

1. Navigate to the **XML Formatter** tool from the home page
2. Paste your XML content in the left textbox
3. Select your preferred indentation size (2, 4, or 8 spaces)
4. Click the **Format** button (or press Ctrl+Enter / Cmd+Enter) to beautify
5. Or click **Minify** to remove all unnecessary whitespace
6. **Choose View Mode:**
   - **Text View**: See formatted XML as text
   - **Tree View**: Clean, minimalist hierarchical visualization with:
     - Collapsible/expandable nodes (▶/▼ arrows)
     - **Expand All** / **Collapse All** buttons for quick tree navigation
     - Item count display in curly braces {n}
     - Color-coded: elements (purple), attributes (blue), values (red)
     - Click anywhere on a line to toggle individual nodes
7. Click **Copy Formatted XML** to copy the output
8. View statistics including line count, character count, size, and element count

### EPOCH Converter

1. Navigate to the **EPOCH Converter** tool from the home page
2. **EPOCH to DateTime:**
   - Enter EPOCH timestamp (seconds or milliseconds)
   - Click **Convert** (or press Enter)
   - View results in both UTC and local timezone
   - Copy individual time formats
3. **DateTime to EPOCH:**
   - Enter date/time manually or use the date picker
   - Click **Convert to EPOCH**
   - View results in both seconds and milliseconds
   - Copy individual values
4. **Quick Actions:**
   - Use Current: Load current timestamp
   - Use Now: Load current date/time
   - Use Today: Load today at midnight

### File Compare

1. Navigate to the **File Compare** tool from the home page
2. Paste your original text/file content in the left panel
3. Paste your modified text/file content in the right panel
4. Select your preferred view mode:
   - **Side-by-Side**: Shows changes side-by-side with color coding
   - **Unified**: Git-style unified diff view
5. Click **Compare** (or press Ctrl+Enter / Cmd+Enter)
6. View detailed statistics:
   - Similarity percentage
   - Lines added (green)
   - Lines deleted (red)
   - Lines modified (yellow)
   - Total lines in each file
7. **Additional Features:**
   - **Swap**: Exchange left and right content
   - **Clear All**: Reset both panels
   - **Copy**: Copy the diff results
   - Automatic view mode switching re-compares

## Project Structure

```
mytools/
├── app.py                      # Main Flask application
├── database.py                 # Database utilities
├── schema.sql                  # Database schema
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── static/
│   ├── css/
│   │   └── style.css          # Custom styles
│   └── js/
│       └── markdown_converter.js  # Markdown converter JS
├── templates/
│   ├── base.html              # Base template
│   ├── index.html             # Home page
│   └── tools/
│       └── markdown_converter.html  # Markdown converter page
└── instance/
    └── mytools.db             # SQLite database (auto-created)
```

## Development

### Adding New Tools

To add a new tool to the collection:

1. Create a new route in `app.py`
2. Create a new template in `templates/tools/`
3. Add any necessary JavaScript in `static/js/`
4. Update the home page (`templates/index.html`) to include the new tool card

### Database

The application uses SQLite3 for data persistence. The database schema is defined in `schema.sql` and includes tables for:
- Tool usage tracking
- Saved conversions (for future use)

## License

This project is open source and available for personal and commercial use.

## Contributing

Feel free to fork this project and add your own tools!

## Support

For issues or questions, please create an issue in the project repository.

---

**MyTools** - Making web utilities accessible and easy to use! 🛠️

