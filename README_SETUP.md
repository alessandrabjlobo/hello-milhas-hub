# Mileage Management System - Setup Guide

## Environment Variables

The application requires the following environment variables (automatically configured via Lovable Cloud):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_supabase_project_id
```

**Note**: These are automatically managed by Lovable Cloud. Do not edit the `.env` file manually.

## Navigation Structure

### Main Navigation
- **Dashboard** (`/dashboard`) - KPIs and overview
- **Sales** 
  - New Sale (`/sales/new`) - Multi-step wizard for creating sales
  - All Sales (`/sales`) - Complete sales history

### Operations
- **Tickets** (`/tickets`) - Ticket management
- **Accounts** (`/accounts`) - Mileage account management
- **Suppliers** (`/suppliers`) - Supplier management

### Tools
- **Calculator** (`/calculator`) - Mileage calculator tools
  - Profit Calculator - Calculate margins and profits
  - Margin Analysis - Real-time margin calculations
  - Quote Generator - Generate customer quotes

### Settings
- **My Airlines** (`/settings/my-airlines`) - Configure airline partnerships
- **Program Rules** (`/settings/programs`) - Set CPF limits and renewal rules
- **Billing** (`/settings/billing`) - Subscription and payment management

### Legal
- **Terms** (`/legal/terms`) - Terms of service
- **Privacy** (`/legal/privacy`) - Privacy policy

## Program Rules Configuration

### Adding Airlines
1. Navigate to Settings → Program Rules (`/settings/programs`)
2. Use the searchable combobox to find existing airlines
3. If airline doesn't exist, type "Name (CODE)" and click "Add"
   - Example: "LATAM (LA)"
4. Set CPF limit (1-1000)
5. Choose renewal type:
   - **Annual**: Resets on January 1st every year
   - **Rolling**: Resets 12 months after first CPF use

### Offline Mode
- The system automatically falls back to localStorage if Supabase is unavailable
- Data syncs automatically when connection is restored
- Offline indicator appears in the page header

## Sales Flow

### Creating a Sale
1. **Step 1: Customer & Flight**
   - Enter customer details (name, CPF, contact)
   - Specify route and travel dates
   - Set passenger count

2. **Step 2: Calculation**
   - Select airline program
   - Choose mileage account
   - Enter miles needed
   - Set price per 1,000 miles
   - Add optional fees/discounts
   - View real-time margin calculator

3. **Step 3: Confirm**
   - Review all details
   - Add PNR/locator
   - Select payment method
   - Confirm sale

### After Sale Creation
- Automatic balance deduction from selected account
- Copyable buyer message with:
  - PNR/Locator
  - Total amount
  - Breakdown (miles, fees, taxes)
  - Payment method
  - Due date

## Data Persistence

### Supabase Tables
- `airline_companies` - Airline/program configurations
- `mileage_accounts` - Customer mileage accounts
- `sales` - Sales transactions
- `agency_program_settings` - Program-specific settings per supplier

### RLS Policies
- **Authenticated users** can view airlines
- **Admins only** can create/update/delete airlines
- **Supplier-scoped access** for accounts and sales

### Error Handling
- 403 errors show user-friendly toast notifications
- Automatic retry suggestions
- Graceful offline fallback

## Testing

### Manual Testing Checklist
- [ ] Navigate to Calculator via sidebar
- [ ] Create airline via "Add 'query'" in Program Rules
- [ ] Set CPF limit and renewal type
- [ ] Create mileage account (defaults should apply)
- [ ] Complete sale flow (balance updates atomically)
- [ ] Copy buyer message
- [ ] Reload page (data persists)

### Known Issues
- Password leak protection disabled (security warning)
- React Router v7 migration warnings (cosmetic)

## TypeScript & Linting

```bash
# Type check
pnpm tsc --noEmit

# Lint
pnpm lint

# Format
pnpm format
```

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify Supabase connection in Network tab
3. Ensure proper authentication/authorization
4. Review RLS policies if data access fails
