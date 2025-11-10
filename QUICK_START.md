# Quick Start Guide - Hello Milhas +

## 🚀 Getting Started

### 1. Environment Setup
**No action needed!** Environment variables are auto-configured by Lovable Cloud:
```env
VITE_SUPABASE_URL=https://esejpxzlijvcvlkkpmci.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
```

### 2. First Login
1. Navigate to `/` (landing page)
2. Click "Começar Agora" → Redirects to `/auth`
3. Sign up with email/password
4. Auto-redirected to `/dashboard`

---

## 📱 Navigation Map

### Main Areas
```
├── 🏠 Dashboard (/dashboard)
│   └── KPIs, quick actions, recent activity
│
├── 💰 Sales
│   ├── Nova Venda (/sales/new) - 3-step wizard
│   └── Todas as Vendas (/sales) - Complete history
│
├── 🔧 Operations
│   ├── Passagens (/tickets) - Ticket management
│   ├── Contas (/accounts) - Mileage accounts
│   └── Fornecedores (/suppliers) - Supplier management
│
├── 🛠️ Tools
│   └── Calculadora (/calculator) - Margin & profit calculator
│
├── 📊 Reports (/reports)
│
├── ⚙️ Settings
│   ├── Minhas Companhias (/settings/my-airlines)
│   ├── Regras do Programa (/settings/programs) ⭐ NEW
│   └── Plano & Pagamento (/settings/billing)
│
└── 📄 Legal
    ├── Termos (/legal/terms)
    └── Privacidade (/legal/privacy)
```

---

## ⚙️ Configure Mileage Programs

### Step-by-Step: Add Your First Program

1. **Navigate to Settings → Regras do Programa**
   ```
   Sidebar → Settings → "Regras do Programa"
   URL: /#/settings/programs
   ```

2. **Add an Airline**
   - Type in the combobox: `LATAM (LA)`
   - If not found, click "Add 'LATAM (LA)'"
   - System creates the airline automatically

3. **Configure CPF Rules**
   - **CPF Limit**: `25` (default, can be 1-1000)
   - **Renewal Type**:
     - `por ano (01/jan)` - Resets January 1st every year
     - `em 1 ano após uso` - Resets 12 months after first use

4. **Save**
   - Click "Salvar Regra"
   - Toast notification confirms success
   - Settings persist to database

### Quick Add Multiple Programs
```
Add "LATAM (LA)" → CPF 25, annual
Add "Azul (AD)" → CPF 30, rolling
Add "Gol (G3)" → CPF 20, annual
Add "AVIANCA (AV)" → CPF 25, rolling
```

---

## 💵 Create Your First Sale

### Step-by-Step

1. **Navigate to Sales → Nova Venda**
   ```
   Sidebar → Sales → "Nova Venda"
   URL: /#/sales/new
   ```

2. **Step 1: Customer & Flight**
   ```
   Customer Name: João Silva
   CPF: 123.456.789-00
   Phone: (11) 98765-4321
   Route: São Paulo → Lisboa
   Departure: 2025-02-15
   Return: 2025-03-01 (optional)
   Passengers: 2
   ```

3. **Step 2: Calculation**
   ```
   Airline/Program: LATAM (LA)
   Account: Select from your accounts
   Miles Needed: 100,000
   Price per 1,000: R$ 45,00
   Fees/Taxes: R$ 1,200,00
   Payment Method: PIX
   PNR/Locator: ABC123 (optional, can add later)
   ```
   
   **💡 Margin Calculator shows real-time**:
   - Cost: R$ 2,900 (100k × R$ 0.029)
   - Revenue: R$ 5,700 (100k × R$ 45/1000 + R$ 1,200)
   - Margin: R$ 2,800 (49.1%) ✅ GREEN

4. **Step 3: Confirm**
   - Review all details
   - Click "Confirmar Venda"
   - Balance updated atomically

5. **Success Dialog**
   - **Full message** with all details (copy for WhatsApp)
   - **Short message**: `PNR ABC123 • Total R$ 5.700,00` (quick copy)
   - One-click copy to clipboard

---

## 🧮 Use the Calculator

### Navigate to Tools → Calculadora
```
Sidebar → Tools → "Calculadora"
URL: /#/calculator
```

### Three Tabs

#### 1. Profit Calculator
```
Miles Needed: 50,000
Cost per Mile: R$ 0.029
Sale Price per 1k: R$ 45.00
= Profit: R$ 800.00 (35.6% margin)
```

#### 2. Margin Analysis (What-if)
```
Adjust any variable, see instant impact:
• Miles: 50,000 → 75,000
• Price/1k: R$ 45 → R$ 42
• Fees: R$ 0 → R$ 500
= Live margin recalculation
```

**Break-Even Helper**:
- Target margin: 20%
- System suggests: "Minimum price/1k: R$ 38.50"

#### 3. Quote Generator
```
Customer Name: Maria Santos
Route: Rio → Orlando
Miles: 80,000
Price/1k: R$ 48.00
Fees: R$ 1,500.00
= Generate professional quote
= Copy to clipboard / Export PDF (future)
```

---

## 🔧 Common Tasks

### Add a Mileage Account
```
Navigate: Operations → Contas → "Nova Conta"

Fill:
  - Airline: LATAM
  - Account Number: 123456789
  - Holder Name: João Silva
  - Holder CPF: 123.456.789-00 (encrypted)
  - Password: ******** (encrypted)
  - Balance: 500,000 miles
  - Cost per Mile: R$ 0.029

Save → Account appears in list
```

### Register a Ticket
```
Navigate: Operations → Passagens → "Nova Passagem"

Fill:
  - Sale: Select from dropdown
  - Ticket Code: 9571234567890
  - PNR: ABC123
  - Airline: LATAM
  - Route: GRU → LIS
  - Passenger Name: João Silva
  - Passenger CPF: 123.456.789-00
  - Departure: 2025-02-15
  - Return: 2025-03-01 (optional)

Save → Ticket linked to sale
```

---

## 🐛 Troubleshooting

### Issue: Can't see data after logging in
**Solution**: Check your profile has a `supplier_id` assigned
```sql
-- Admin can run in Lovable Cloud → Database
SELECT id, email, supplier_id FROM profiles WHERE email = 'your@email.com';
```

### Issue: 403 error when creating airlines
**Cause**: Only admins can create airlines
**Solution**: 
1. Request admin role from system admin
2. Or use existing airlines from the list

### Issue: Sale creation fails
**Check**:
1. Selected account has sufficient balance
2. All required fields filled
3. Price per 1k is greater than cost per mile
4. Payment method selected

### Issue: Program rules don't save
**Check**:
1. CPF limit is between 1-1000
2. Renewal type is selected
3. User is authenticated
4. Network connection is active

**Offline Mode**: If Supabase is unreachable, data saves to localStorage and syncs automatically when connection restored.

---

## 📊 Dashboard KPIs Explained

### Metrics Cards
```
┌─────────────────────┐
│ Total Revenue       │  Sum of all sales in period
│ R$ 125.450,00      │  (7/30/90 days)
└─────────────────────┘

┌─────────────────────┐
│ Miles Sold          │  Total miles used in sales
│ 2.5M miles         │  
└─────────────────────┘

┌─────────────────────┐
│ Avg Price/1k        │  Average revenue per 1k miles
│ R$ 48,50           │  Benchmark your pricing
└─────────────────────┘

┌─────────────────────┐
│ Avg Margin          │  Average profit margin %
│ 32.5%              │  Green = Good (>20%)
└─────────────────────┘
```

### Top Programs
Shows your 5 most-used programs by sales count
```
LATAM (LA)    → 45 sales
Azul (AD)     → 32 sales
Gol (G3)      → 28 sales
AVIANCA (AV)  → 15 sales
TAP (TP)      → 12 sales
```

### Low Balance Accounts
Alerts when accounts drop below 50k miles
```
⚠️ LATAM #123456789 → 35k miles remaining
⚠️ Azul #987654321  → 12k miles remaining
```

---

## 🎯 Best Practices

### 1. Configure Programs First
Before creating accounts/sales, set up your programs with correct CPF rules.

### 2. Accurate Cost per Mile
Always update account cost per mile when buying miles at different rates.

### 3. Use Margin Calculator
Before quoting clients, run the numbers through the calculator to ensure profitability.

### 4. Track PNRs
Add PNR/locators as soon as issued for easy reference and customer support.

### 5. Regular Balance Checks
Monitor low balance alerts to avoid sale failures.

### 6. Backup Important Data
System auto-saves to Supabase, but keep your own records for critical information.

---

## 🔐 Security Notes

### Encrypted Fields
- ✅ Customer CPFs (AES-256)
- ✅ Account passwords (PGP)
- ✅ All data encrypted at rest (Supabase)

### Access Control (RLS)
- Users only see their supplier's data
- Admins can view all data
- Operations scoped to supplier_id

### Session Management
- Auto-refresh tokens
- Persistent sessions (localStorage)
- Secure logout clears all local data

---

## 📞 Support

### Common Questions
- **How to add users?**: Admin → Usuários → Invite
- **How to change plan?**: Settings → Plano & Pagamento
- **How to export data?**: Reports → Select period → Export CSV

### System Status
- All systems operational ✅
- Database: Lovable Cloud (Supabase)
- Uptime: 99.9%

---

_Version: 2.0_  
_Last Updated: 2025-01-10_  
_Platform: Lovable Cloud + React + Supabase_
