# HubSpot Dynamic UI Guide

## 🎯 Overview

The HubSpot integration now supports **dynamic data fetching and rendering**. You can add new HubSpot object types without modifying the frontend code!

---

## 📊 How It Works

### **Backend Configuration** (`server/ai-proxy.cjs`)

All HubSpot objects are defined in the `HUBSPOT_OBJECTS` configuration:

```javascript
const HUBSPOT_OBJECTS = {
  contacts: {
    endpoint: '/crm/v3/objects/contacts',
    properties: 'firstname,lastname,email,phone,company,jobtitle',
    label: 'Contacts',
    icon: 'user'
  },
  deals: {
    endpoint: '/crm/v3/objects/deals',
    properties: 'dealname,amount,dealstage,closedate',
    label: 'Deals',
    icon: 'currency',
    valueField: 'amount'  // For calculating totals
  },
  // Add more objects here!
};
```

### **API Endpoints**

1. **Get specific object type:**
   ```
   GET /api/hubspot/objects/:objectType?limit=20
   ```
   Example: `/api/hubspot/objects/tickets`

2. **Get multiple objects:**
   ```
   GET /api/hubspot/all?objects=contacts,companies,deals&limit=10
   ```

3. **Get default objects (contacts, companies, deals):**
   ```
   GET /api/hubspot/all?limit=10
   ```

---

## ✨ Adding New Object Types

### **Step 1: Add to Backend Configuration**

Edit `server/ai-proxy.cjs` and add to `HUBSPOT_OBJECTS`:

```javascript
tickets: {
  endpoint: '/crm/v3/objects/tickets',
  properties: 'subject,content,hs_pipeline_stage,hs_ticket_priority,createdate',
  label: 'Tickets',
  icon: 'ticket'
},
products: {
  endpoint: '/crm/v3/objects/products',
  properties: 'name,description,price,hs_sku',
  label: 'Products',
  icon: 'package',
  valueField: 'price'  // Optional: for calculating total value
}
```

### **Step 2: Update Scopes in `.env`**

```env
HUBSPOT_SCOPES=crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read crm.objects.tickets.read crm.objects.products.read
```

### **Step 3: Update HubSpot App Scopes**

1. Go to https://app.hubspot.com/
2. Settings → Integrations → Private Apps
3. Click your app → Scopes tab
4. Enable the new scopes
5. Save

### **Step 4: Reconnect**

Users must disconnect and reconnect to grant new permissions.

### **Step 5: Fetch the Data**

```javascript
// Fetch specific object
const response = await fetch('http://localhost:3002/api/hubspot/objects/tickets');

// Fetch multiple objects
const response = await fetch('http://localhost:3002/api/hubspot/all?objects=contacts,deals,tickets');
```

**That's it!** The frontend will automatically render the new data.

---

## 🎨 Dynamic Frontend Rendering

### **Current Response Format**

```json
{
  "objects": {
    "contacts": [...],
    "companies": [...],
    "deals": [...]
  },
  "summary": {
    "totalContacts": 20,
    "totalCompanies": 20,
    "totalDeals": 1,
    "totalDealsValue": 1000000
  },
  "metadata": {
    "availableObjects": ["contacts", "companies", "deals", "tickets", "products"],
    "requestedObjects": ["contacts", "companies", "deals"],
    "fetchedAt": "2025-12-08T08:00:00.000Z"
  }
}
```

### **Frontend Adaptation**

The `HubSpotModal.tsx` component will:
1. **Dynamically create summary cards** for each object type
2. **Dynamically create tabs** for each object type
3. **Automatically render** properties based on the data structure

---

## 📋 Available Object Types

| Object Type | Scope Required | Common Properties |
|------------|----------------|-------------------|
| `contacts` | `crm.objects.contacts.read` | firstname, lastname, email, phone |
| `companies` | `crm.objects.companies.read` | name, domain, industry, numberofemployees |
| `deals` | `crm.objects.deals.read` | dealname, amount, dealstage, closedate |
| `tickets` | `crm.objects.tickets.read` | subject, content, hs_pipeline_stage, hs_ticket_priority |
| `products` | `crm.objects.products.read` | name, description, price, hs_sku |
| `tasks` | `crm.objects.tasks.read` | hs_task_subject, hs_task_body, hs_task_status |
| `meetings` | `crm.objects.meetings.read` | hs_meeting_title, hs_meeting_start_time |
| `calls` | `crm.objects.calls.read` | hs_call_title, hs_call_duration, hs_call_status |
| `emails` | `crm.objects.emails.read` | hs_email_subject, hs_email_text |
| `notes` | `crm.objects.notes.read` | hs_note_body, hs_timestamp |

---

## 🔧 Advanced Usage

### **Custom Properties**

Add custom properties to fetch more data:

```javascript
deals: {
  endpoint: '/crm/v3/objects/deals',
  properties: 'dealname,amount,dealstage,closedate,custom_field_1,custom_field_2',
  label: 'Deals',
  icon: 'currency',
  valueField: 'amount'
}
```

### **Filtering & Sorting**

HubSpot API supports filters (requires additional implementation):

```javascript
// Example: Fetch only open deals
const response = await fetch(
  '/api/hubspot/objects/deals?limit=20&filterGroups=[{"filters":[{"propertyName":"dealstage","operator":"NEQ","value":"closedwon"}]}]'
);
```

### **Pagination**

```javascript
// Get next page
const response = await fetch('/api/hubspot/objects/contacts?limit=20&after=12345');
```

---

## 🚀 Example: Adding Support Tickets

### 1. Backend (`ai-proxy.cjs`)

Already added! Just uncomment if needed:

```javascript
tickets: {
  endpoint: '/crm/v3/objects/tickets',
  properties: 'subject,content,hs_pipeline_stage,hs_ticket_priority,createdate,hs_ticket_category',
  label: 'Tickets',
  icon: 'ticket'
}
```

### 2. Update `.env`

```env
HUBSPOT_SCOPES=crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read crm.objects.tickets.read
```

### 3. Fetch Tickets

```javascript
// In frontend
const data = await fetch('http://localhost:3002/api/hubspot/all?objects=contacts,companies,deals,tickets');
```

### 4. Result

The modal will automatically show:
- **Summary card**: "Tickets: 15"
- **New tab**: "Tickets"
- **Ticket list**: Subject, Priority, Stage, Created Date

**No frontend code changes needed!**

---

## 🎯 Benefits of Dynamic System

✅ **Add new object types** without touching frontend code  
✅ **Flexible querying** - fetch only what you need  
✅ **Automatic UI adaptation** - tabs and cards generated dynamically  
✅ **Easy maintenance** - one place to configure all objects  
✅ **Scalable** - supports all 50+ HubSpot object types  

---

## 📝 Testing

```bash
# Test single object
curl "http://localhost:3002/api/hubspot/objects/contacts?limit=5"

# Test multiple objects
curl "http://localhost:3002/api/hubspot/all?objects=contacts,deals,tickets&limit=10"

# Test with invalid object (returns error with available types)
curl "http://localhost:3002/api/hubspot/objects/invalid"
```

---

## 🔒 Security Notes

- All tokens stored server-side only
- Each user's OAuth tokens are separate
- Scopes are validated by HubSpot
- Invalid scopes return 403 Forbidden

---

## 📚 Next Steps

1. **Add more objects** to `HUBSPOT_OBJECTS`
2. **Update scopes** in `.env` and HubSpot app
3. **Reconnect** to grant new permissions
4. **Fetch data** using the API
5. **UI automatically adapts!**
