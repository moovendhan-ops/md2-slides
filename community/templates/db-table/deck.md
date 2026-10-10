<!-- layout: custom:db-table -->
^ PostgreSQL · orders service
# orders
One row per order. The first column is the primary key.
:::stats
- id | uuid
- customer_id | uuid → customers
- status | order_status
- total_cents | integer
- currency | char(3)
- created_at | timestamptz
:::
