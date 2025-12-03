# 📊 Table-to-Chart Auto-Conversion Feature

## Overview
OneMindAI now automatically detects tables in AI responses and converts them into interactive charts! This makes data visualization seamless and automatic.

---

## 🎯 What It Does

### **Automatic Detection**
- Scans all markdown tables in AI responses
- Identifies tables with numeric data
- Determines the best chart type automatically
- Generates interactive ECharts visualizations

### **Smart Chart Type Selection**
The system intelligently chooses the best chart type based on your data:

| Data Pattern | Chart Type | Example |
|--------------|------------|---------|
| 2 columns, ≤10 rows | **Pie Chart** | Category distribution |
| Time/Date column | **Line Chart** | Trends over time |
| 2 numeric columns | **Scatter Plot** | Correlation analysis |
| Multiple categories | **Bar Chart** | Comparisons |

---

## 📋 Supported Table Formats

### **1. Sales Data (Bar Chart)**
```markdown
| Product    | Revenue  | Units Sold |
|------------|----------|------------|
| Laptop     | $45,000  | 150        |
| Phone      | $32,000  | 320        |
| Tablet     | $18,000  | 180        |
| Monitor    | $12,000  | 240        |
```

**Result:** Interactive bar chart comparing products

### **2. Time Series (Line Chart)**
```markdown
| Month      | Sales    | Profit   |
|------------|----------|----------|
| January    | $50,000  | $12,000  |
| February   | $55,000  | $14,000  |
| March      | $62,000  | $16,500  |
| April      | $58,000  | $15,200  |
```

**Result:** Line chart showing trends over time

### **3. Distribution (Pie Chart)**
```markdown
| Category    | Percentage |
|-------------|------------|
| Electronics | 45%        |
| Clothing    | 30%        |
| Food        | 15%        |
| Other       | 10%        |
```

**Result:** Pie chart showing distribution

### **4. Correlation (Scatter Plot)**
```markdown
| Temperature | Sales   |
|-------------|---------|
| 20          | 1200    |
| 25          | 1500    |
| 30          | 1800    |
| 35          | 2100    |
```

**Result:** Scatter plot showing correlation

---

## 🔍 Detection Logic

### **What Makes a Table "Chartable"?**

1. **Has Headers** - First row defines column names
2. **Has Data** - At least 3 rows (header + separator + data)
3. **Numeric Columns** - At least one column with >50% numeric values
4. **Proper Format** - Valid markdown table syntax with `|` separators

### **Numeric Value Detection**
The system recognizes:
- ✅ Plain numbers: `1234`, `45.67`
- ✅ Currency: `$1,234`, `€45.67`, `£100`, `¥500`
- ✅ Percentages: `45%`, `12.5%`
- ✅ Formatted numbers: `1,234,567`

---

## 🎨 Chart Features

### **Interactive Elements**
- **Hover Tooltips** - See exact values on hover
- **Legend Toggle** - Click legend items to show/hide series
- **Zoom & Pan** - Zoom into data ranges (line/scatter charts)
- **Responsive** - Auto-resizes with window

### **Visual Enhancements**
- **Smooth Animations** - Charts animate on load
- **Color Gradients** - Beautiful color schemes
- **Shadow Effects** - Professional appearance
- **Emphasis States** - Hover effects on data points

---

## 📊 Example Prompts

Try these prompts to see automatic chart generation:

### **1. Sales Analysis**
```
Analyze Q1 sales data and show me a comparison table of our top 5 products 
with their revenue and units sold.
```

### **2. Trend Analysis**
```
Show me monthly website traffic for the last 6 months in a table format.
```

### **3. Market Share**
```
Create a table showing market share distribution among top competitors.
```

### **4. Performance Metrics**
```
Compare the performance metrics of different marketing channels in a table.
```

---

## 🔧 Technical Details

### **Processing Flow**

1. **Table Detection**
   ```typescript
   extractMarkdownTables(content) → string[]
   ```

2. **Table Parsing**
   ```typescript
   parseMarkdownTable(tableText) → { headers, rows }
   ```

3. **Chartability Check**
   ```typescript
   isChartableTable(tableData) → boolean
   ```

4. **Chart Type Detection**
   ```typescript
   detectChartType(tableData) → 'bar' | 'line' | 'pie' | 'scatter'
   ```

5. **ECharts Config Generation**
   ```typescript
   tableToEChartsConfig(tableData, chartType) → EChartsOption
   ```

6. **Rendering**
   ```tsx
   <TableChartRenderer chart={chartConfig} />
   ```

---

## 🎯 Chart Type Selection Algorithm

```typescript
// Pie Chart: 2 columns, ≤10 rows
if (numColumns === 2 && numRows <= 10) return 'pie';

// Line Chart: Time-based first column
if (firstHeader.includes('time|date|year|month|day|quarter')) 
  return 'line';

// Scatter: Two numeric columns
if (numColumns === 2 && bothColumnsNumeric) 
  return 'scatter';

// Default: Bar Chart
return 'bar';
```

---

## 📦 Components

### **1. chart-utils.ts**
Core utilities for table detection and conversion:
- `extractMarkdownTables()` - Find all tables
- `parseMarkdownTable()` - Parse table structure
- `isChartableTable()` - Check if chartable
- `detectChartType()` - Determine best chart type
- `tableToEChartsConfig()` - Generate chart config
- `convertTablesToCharts()` - Main conversion function

### **2. TableChartRenderer.tsx**
React component for rendering table charts:
- ECharts initialization
- Responsive resizing
- Source table display
- Interactive features

### **3. EnhancedMarkdownRenderer.tsx**
Integration point:
- Calls `convertTablesToCharts()` before markdown processing
- Stores chart configs in state
- Renders `TableChartRenderer` components

---

## 🎨 Customization

### **Chart Titles**
Auto-generated based on chart type:
- Bar: "Comparison"
- Line: "Trend Analysis"
- Pie: "Data Distribution"
- Scatter: "Scatter Plot"

### **Color Schemes**
- **Bar Charts:** Blue gradient
- **Line Charts:** Multi-color series
- **Pie Charts:** Rainbow palette
- **Scatter Charts:** Blue points

---

## 🚀 Usage Examples

### **Example 1: Revenue Comparison**

**Prompt:**
```
Show me Q4 revenue by region in a table
```

**AI Response:**
```markdown
| Region      | Revenue   |
|-------------|-----------|
| North       | $250,000  |
| South       | $180,000  |
| East        | $220,000  |
| West        | $195,000  |
```

**Result:** Automatic bar chart showing regional revenue comparison

### **Example 2: Growth Trend**

**Prompt:**
```
Display monthly user growth for the past year
```

**AI Response:**
```markdown
| Month | Users  |
|-------|--------|
| Jan   | 1,200  |
| Feb   | 1,450  |
| Mar   | 1,680  |
| Apr   | 1,920  |
| May   | 2,150  |
```

**Result:** Automatic line chart showing growth trend

---

## 💡 Benefits

1. **Zero Configuration** - Works automatically
2. **Smart Detection** - Identifies best chart type
3. **Interactive** - Full ECharts functionality
4. **Responsive** - Works on all screen sizes
5. **Source Preservation** - Original table still visible
6. **Terminal Logging** - See detection in console

---

## 🔍 Terminal Logging

When tables are detected, you'll see:

```
[TERMINAL] LIBRARY_TRIGGERED: {
  libraryName: 'Table Detection',
  action: 'Scanning for chartable tables'
}

[TERMINAL] ✅ Detected 2 chartable table(s)

[TERMINAL] CHART_RENDERED: {
  chartType: 'table-generated',
  dataPoints: 4,
  library: 'ECharts'
}
```

---

## 🎯 Future Enhancements

Potential improvements:
- [ ] Custom chart type selection
- [ ] More chart types (area, radar, heatmap)
- [ ] Chart export (PNG, SVG, PDF)
- [ ] Data table editing
- [ ] Multiple chart views for same data
- [ ] Chart annotations

---

## ✅ Summary

**The table-to-chart feature makes data visualization effortless:**

1. ✅ **Automatic** - No manual chart creation needed
2. ✅ **Smart** - Chooses the best chart type
3. ✅ **Interactive** - Full ECharts capabilities
4. ✅ **Beautiful** - Professional visualizations
5. ✅ **Flexible** - Supports multiple data patterns

**Just ask for a table, and get an interactive chart automatically!** 📊🎉
