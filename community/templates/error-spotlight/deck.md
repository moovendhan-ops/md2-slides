<!-- layout: custom:error-spotlight -->
^ TypeError · checkout-service
# Cannot read properties of undefined (reading 'id')
Guard against an empty cart before reading cart.items[0].
```text
at createOrder (src/orders/create.ts:42:19)
at async handler (src/api/checkout.ts:18:5)
at async Server.<anonymous> (node:internal/http:310:7)
```
