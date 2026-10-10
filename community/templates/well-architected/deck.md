<!-- layout: custom:well-architected -->
^ Review findings
# Well-Architected review
:::cards
- gear | Operational excellence | Runbooks in place; add game days
- shield-check | Security | MFA enforced; rotate old IAM keys
- heartbeat | Reliability | Multi-AZ RDS; no cross-region backup
- gauge | Performance | Lambda cold starts on checkout
- currency-dollar | Cost | 30% idle EC2 at night
- leaf | Sustainability | Move batch jobs to Graviton
:::
