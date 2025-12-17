# HubSpot OAuth Scopes Guide

## 📋 Available HubSpot Scopes

### **CRM Objects (Read)**
```
crm.objects.contacts.read       # Read contacts
crm.objects.companies.read      # Read companies
crm.objects.deals.read          # Read deals
crm.objects.owners.read         # Read users/owners
crm.objects.quotes.read         # Read quotes
crm.objects.line_items.read     # Read line items (products in deals)
crm.objects.products.read       # Read products
crm.objects.tickets.read        # Read support tickets
crm.objects.goals.read          # Read goals
crm.objects.calls.read          # Read logged calls
crm.objects.emails.read         # Read logged emails
crm.objects.meetings.read       # Read logged meetings
crm.objects.notes.read          # Read notes
crm.objects.tasks.read          # Read tasks
```

### **CRM Objects (Write)**
```
crm.objects.contacts.write      # Create/update contacts
crm.objects.companies.write     # Create/update companies
crm.objects.deals.write         # Create/update deals
crm.objects.tickets.write       # Create/update tickets
```

### **Lists & Segments**
```
crm.lists.read                  # Read contact lists
crm.lists.write                 # Create/update lists
```

### **Marketing**
```
content                         # Access marketing content
forms                           # Access forms
forms-uploaded-files            # Access form file uploads
```

### **Analytics & Reports**
```
analytics.read                  # Read analytics data
reports                         # Access reports
```

### **Settings**
```
crm.schemas.contacts.read       # Read contact properties
crm.schemas.companies.read      # Read company properties
crm.schemas.deals.read          # Read deal properties
crm.schemas.contacts.write      # Create custom contact properties
crm.schemas.companies.write     # Create custom company properties
crm.schemas.deals.write         # Create custom deal properties
```

### **Automation**
```
automation                      # Access workflows
```

### **Files**
```
files                           # Access file manager
files.ui_hidden.read            # Read hidden files
```

---

## 🎯 Recommended Scope Combinations

### **Basic CRM Access (Current)**
```env
HUBSPOT_SCOPES=crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read
```

### **Full CRM Read Access**
```env
HUBSPOT_SCOPES=crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read crm.objects.owners.read crm.objects.products.read crm.objects.tickets.read crm.objects.quotes.read crm.objects.line_items.read
```

### **CRM + Activities**
```env
HUBSPOT_SCOPES=crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read crm.objects.calls.read crm.objects.emails.read crm.objects.meetings.read crm.objects.notes.read crm.objects.tasks.read
```

### **CRM + Marketing**
```env
HUBSPOT_SCOPES=crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read crm.lists.read content forms
```

### **Full Read + Write**
```env
HUBSPOT_SCOPES=crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write crm.objects.deals.read crm.objects.deals.write crm.objects.tickets.read crm.objects.tickets.write
```

---

## 🔧 How to Add New Scopes

### **Step 1: Update .env file**
```env
HUBSPOT_SCOPES=crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read crm.objects.tickets.read crm.objects.owners.read crm.objects.products.read
```

### **Step 2: Update HubSpot App Settings**
1. Go to https://app.hubspot.com/
2. Navigate to Settings → Integrations → Private Apps (or your app)
3. Click on your app
4. Go to "Scopes" tab
5. Enable the new scopes you added
6. Save changes

### **Step 3: Reconnect**
- Users must disconnect and reconnect to grant new permissions
- Old tokens won't have the new scopes

### **Step 4: Add Backend Endpoints** (see below)

---

## 📊 HubSpot API Endpoints by Scope

| Scope | API Endpoint | Example |
|-------|-------------|---------|
| `crm.objects.contacts.read` | `/crm/v3/objects/contacts` | Get all contacts |
| `crm.objects.companies.read` | `/crm/v3/objects/companies` | Get all companies |
| `crm.objects.deals.read` | `/crm/v3/objects/deals` | Get all deals |
| `crm.objects.tickets.read` | `/crm/v3/objects/tickets` | Get support tickets |
| `crm.objects.owners.read` | `/crm/v3/owners` | Get users/owners |
| `crm.objects.products.read` | `/crm/v3/objects/products` | Get products |
| `crm.objects.quotes.read` | `/crm/v3/objects/quotes` | Get quotes |
| `crm.objects.line_items.read` | `/crm/v3/objects/line_items` | Get line items |
| `crm.objects.calls.read` | `/crm/v3/objects/calls` | Get logged calls |
| `crm.objects.emails.read` | `/crm/v3/objects/emails` | Get logged emails |
| `crm.objects.meetings.read` | `/crm/v3/objects/meetings` | Get logged meetings |
| `crm.objects.notes.read` | `/crm/v3/objects/notes` | Get notes |
| `crm.objects.tasks.read` | `/crm/v3/objects/tasks` | Get tasks |
| `crm.lists.read` | `/crm/v3/lists` | Get contact lists |

---

## 🚀 Example: Adding Tickets Support

### 1. Update .env
```env
HUBSPOT_SCOPES=crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read crm.objects.tickets.read
```

### 2. Add Backend Route (ai-proxy.cjs)
```javascript
// Get tickets
app.get('/api/hubspot/tickets', async (req, res) => {
  try {
    const userId = getHubSpotUserId(req);
    const accessToken = await getValidHubSpotToken(userId);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Not connected' });
    }

    const limit = req.query.limit || 20;
    const response = await fetch(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/tickets?limit=${limit}&properties=subject,content,hs_pipeline_stage,hs_ticket_priority,createdate`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Update Frontend Types (HubSpotModal.tsx)
```typescript
interface HubSpotTicket {
  id: string;
  properties: {
    subject: string;
    content: string;
    hs_pipeline_stage: string;
    hs_ticket_priority: string;
    createdate: string;
  };
}

interface HubSpotData {
  contacts: HubSpotContact[];
  companies: HubSpotCompany[];
  deals: HubSpotDeal[];
  tickets: HubSpotTicket[];  // Add this
  summary: {
    totalContacts: number;
    totalCompanies: number;
    totalDeals: number;
    totalTickets: number;      // Add this
    totalDealValue: number;
  };
}
```

### 4. Fetch Tickets in Frontend
```typescript
const dataRes = await fetch('http://localhost:3002/api/hubspot/all?limit=20');
```

### 5. Display in UI
The modal will automatically show a new "Tickets" tab (see dynamic UI section below)

---

## ⚠️ Important Notes

1. **Scope Changes Require Reconnection**: Users must disconnect and reconnect to grant new permissions
2. **Rate Limits**: HubSpot has API rate limits (100 requests per 10 seconds for most endpoints)
3. **Free Tier Limits**: Some features require paid HubSpot plans
4. **Write Scopes**: Be careful with write scopes - they allow modifying data
5. **Minimum Scopes**: Always request only the scopes you actually need

---

## 🔒 Security Best Practices

1. **Never expose scopes in frontend** - Keep in .env (backend only)
2. **Request minimum scopes** - Only what you need
3. **Validate data** - Always validate data from HubSpot before using
4. **Handle errors** - Scope errors return 403 Forbidden
5. **Audit logs** - Log all write operations

---

## 📝 Testing New Scopes

```bash
# Test if scope is granted
curl -X GET "https://api.hubapi.com/crm/v3/objects/tickets?limit=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# If you get 403, the scope is not granted
# If you get 200, the scope is working
```
