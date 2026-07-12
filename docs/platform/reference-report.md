# Reference Report

## Reference Contract Status

| Reference Type | Owner | Consumers | Owner Exists | Status |
|---|---|---|---|---|
| AddressReference | address | organization | ✅ | ✅ pass |
| BillingReference | billing | — | ✅ | ✅ pass |
| BookingReference | booking | — | ❌ | ❌ fail |
| CatalogReference | catalog | pricing | ✅ | ✅ pass |
| InventoryReference | inventory | — | ❌ | ❌ fail |
| MediaReference | media | — | ✅ | ✅ pass |
| OrderReference | order | billing | ❌ | ❌ fail |
| OrganizationReference | organization | billing, catalog, media, pricing | ✅ | ✅ pass |
| PaymentReference | payment | — | ❌ | ❌ fail |
| PricingReference | pricing | billing | ✅ | ✅ pass |
| UserReference | user | catalog, organization | ✅ | ✅ pass |
