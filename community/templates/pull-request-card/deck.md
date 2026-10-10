<!-- layout: custom:pull-request-card -->
^ #482
# Add multi-AZ failover for checkout
Moves the orders table to Aurora with a reader in a second AZ and adds a failover runbook.
:::cards
- check-circle | Build and unit tests | passed in 1m 12s
- check-circle | Terraform plan | +6 ~2 -0
- check-circle | Security scan | no findings
- user-circle | Review | approved by 2
:::
