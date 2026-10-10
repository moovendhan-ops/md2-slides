<!-- layout: custom:dr-strategy -->
^ Resilience
# Pick a recovery target
We recommend warm standby for checkout.
:::stats
- Backup and restore | RTO hours · RPO 24h
- Pilot light | RTO 30 min · RPO minutes
- Warm standby | RTO minutes · RPO seconds
- Multi-site active | RTO ~0 · RPO ~0
:::
